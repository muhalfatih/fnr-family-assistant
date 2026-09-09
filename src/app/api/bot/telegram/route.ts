import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { deleteReceiptMedia } from "@/lib/storage/r2";
import {
  sendTelegramMessage,
  editTelegramMessageText,
  answerTelegramCallbackQuery,
  downloadTelegramFile,
  sendTelegramChatAction,
  deleteTelegramMessage,
  withContinuousChatAction,
} from "@/lib/telegram/bot";
import {
  registerBotProcess,
  cancelBotProcess,
  completeBotProcess,
  updateProcessLoadingMessage,
  recordChatLog,
} from "@/lib/bot/process-manager";
import { checkMessageRelevance, checkRateLimit, getPoliteRejectionMessage } from "@/lib/bot/relevance-guard";
import { isWebhookDuplicate } from "@/lib/bot/idempotency";
import { formatRupiah } from "@/lib/utils";
import { normalizePhoneNumber } from "@/lib/auth-otp";
import {
  ingestMultimodalInput,
  getFamilyFinancialContext,
  IngestionMediaInput,
} from "@/lib/ingestion/multimodal-ingestor";

// Persistent Quick Action Reply Keyboard
const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "📊 Ringkasan Keuangan" }, { text: "💳 Saldo Rekening" }],
    [{ text: "🧾 5 Transaksi Terakhir" }, { text: "🎯 Sisa Anggaran" }],
    [{ text: "💡 Tanya AI Keuangan" }, { text: "❓ Bantuan" }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

/**
 * Helper to smoothly edit loading message in-place, or send new message and cleanup
 */
async function replyOrEditLoading(
  chatId: number | string,
  loadingMessageId: number | null,
  text: string,
  replyMarkup?: any
) {
  if (loadingMessageId) {
    try {
      const editRes = await editTelegramMessageText(chatId, loadingMessageId, text, replyMarkup);
      if (editRes && editRes.ok) {
        return editRes;
      }
      // If edit failed, delete loading message and send fresh message
      await deleteTelegramMessage(chatId, loadingMessageId);
    } catch (e) {
      console.error("Error editing loading message:", e);
    }
  }
  return await sendTelegramMessage(chatId, text, replyMarkup);
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    message: "F&R Family Hub Telegram Webhook is operational.",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Lapis 1: Webhook Idempotency Check (Pencegah Retry Storm dari Server Telegram)
  if (body?.update_id && isWebhookDuplicate(`tg_update_${body.update_id}`)) {
    console.log(`[Telegram] Dropping duplicate webhook retry for update_id: ${body.update_id}`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const rawMsg = body?.message || body?.edited_message || body?.channel_post;
  if (rawMsg?.message_id && rawMsg?.chat?.id && isWebhookDuplicate(`tg_msg_${rawMsg.chat.id}_${rawMsg.message_id}`)) {
    console.log(`[Telegram] Dropping duplicate message_id: ${rawMsg.message_id} in chat: ${rawMsg.chat.id}`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Live financial context provider from multimodal ingestion module
  const getFamilyFinancialData = getFamilyFinancialContext;

  // Helper to strictly authorize registered family members
  const resolveRegisteredTelegramMember = async (targetChatId: number | string) => {
    try {
      const { data: memberRows, error } = await supabaseAdmin
        .from("family_members")
        .select("*, family:families(*)")
        .eq("telegram_chat_id", targetChatId)
        .limit(5);

      if (error) {
        console.warn("[Telegram Auth] Member lookup warning:", error.message);
      }
      if (memberRows && memberRows.length > 0) {
        // Prioritize member with 'telegram' in full_name, or return first
        const preferred = memberRows.find((m: any) =>
          m.full_name?.toLowerCase().includes("telegram")
        );
        return preferred || memberRows[0];
      }
      return null;
    } catch (err) {
      console.error("[Telegram Auth] Member lookup exception:", err);
      return null;
    }
  };

  // Helper to find member by telegram username (e.g. @username or username)
  const findMemberByTelegramUsername = async (rawUsername: string) => {
    const cleanUsername = rawUsername.replace(/^@/, "").trim().toLowerCase();
    if (!cleanUsername) return null;

    try {
      const { data: members, error } = await supabaseAdmin
        .from("family_members")
        .select("*, family:families(*)");

      if (!error && members) {
        return members.find((m: any) => {
          const u = m.telegram_username ? String(m.telegram_username).replace(/^@/, "").trim().toLowerCase() : "";
          return u === cleanUsername;
        }) || null;
      }
      return null;
    } catch (err) {
      console.error("[Telegram Auth] Username lookup exception:", err);
      return null;
    }
  };

  // Helper to find member by contact phone number
  const findMemberByPhoneNumber = async (phone: string) => {
    const normalized = normalizePhoneNumber(phone);
    if (!normalized) return null;

    try {
      const { data: members, error } = await supabaseAdmin
        .from("family_members")
        .select("*, family:families(*)");

      if (!error && members) {
        return members.find((m: any) => {
          const mPhone = m.whatsapp_number ? normalizePhoneNumber(m.whatsapp_number) : "";
          return mPhone === normalized;
        }) || null;
      }
      return null;
    } catch (err) {
      console.error("[Telegram Auth] Phone lookup exception:", err);
      return null;
    }
  };

  // Helper to link member's telegram chat ID and username
  const linkMemberTelegram = async (memberId: string, targetChatId: number | string, username?: string | null) => {
    const cleanUsername = username ? username.replace(/^@/, "").trim() : null;
    try {
      const updatePayload: any = { telegram_chat_id: Number(targetChatId) };
      if (cleanUsername) updatePayload.telegram_username = cleanUsername;
      await supabaseAdmin.from("family_members").update(updatePayload).eq("id", memberId);
    } catch (err) {
      console.warn("[Telegram Auth] Supabase link update error:", err);
    }
  };

  // Helper to auto-sync latest username if changed
  const autoSyncUsername = (memberId: string, currentUsername?: string | null, newUsername?: string | null) => {
    if (!newUsername) return;
    const cleanCurrent = currentUsername ? currentUsername.replace(/^@/, "").trim().toLowerCase() : "";
    const cleanNew = newUsername.replace(/^@/, "").trim().toLowerCase();
    if (cleanNew && cleanCurrent !== cleanNew) {
      Promise.resolve(
        supabaseAdmin.from("family_members").update({ telegram_username: cleanNew }).eq("id", memberId)
      ).catch((err) => console.warn("[Telegram Auth] Auto-sync username error:", err));
    }
  };

  // 1. Handle Callback Query (Inline Keyboard Actions)
  if (body.callback_query) {
    const cq = body.callback_query;
    const chatId = cq.message?.chat?.id;
    const fromId = cq.from?.id || chatId;
    const messageId = cq.message?.message_id;
    const data = cq.data as string;

    const authorizedCqMember = await resolveRegisteredTelegramMember(fromId);
    if (!authorizedCqMember) {
      await answerTelegramCallbackQuery(cq.id, "⛔ Akses ditolak: Akun Telegram belum terdaftar.");
      return NextResponse.json({ ok: true, dropped: true });
    }

    if (chatId) {
      sendTelegramChatAction(chatId, "typing").catch(() => {});
    }

    // Cancel Active Running Task
    if (data.startsWith("cancel_task:")) {
      const taskId = data.replace("cancel_task:", "");
      await cancelBotProcess(taskId, "Dibatalkan melalui tombol chat Telegram");
      await answerTelegramCallbackQuery(cq.id, "Proses telah dihentikan!");
      if (chatId && messageId) {
        await editTelegramMessageText(
          chatId,
          messageId,
          "⛔ *Proses telah dibatalkan atas permintaan pengguna.*",
          { inline_keyboard: [] }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("undo:")) {
      const transactionId = data.replace("undo:", "");

      // 1. Fetch transaction first to obtain media pointers
      let targetTx: any = null;
      if (isSupabaseConfigured()) {
        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("id, drive_file_id, drive_view_url, media_url")
          .eq("id", transactionId)
          .maybeSingle();
        targetTx = tx;

        const { error } = await supabaseAdmin.from("transactions").delete().eq("id", transactionId);
        if (error) {
          await answerTelegramCallbackQuery(cq.id, "Gagal membatalkan transaksi.");
          return NextResponse.json({ ok: true });
        }
      }

      // 2. Clean up media storage (Cloudflare R2 / Local) to save space
      if (targetTx && (targetTx.drive_file_id || targetTx.drive_view_url || targetTx.media_url)) {
        deleteReceiptMedia({
          fileId: targetTx.drive_file_id,
          viewUrl: targetTx.drive_view_url,
          mediaUrl: targetTx.media_url,
        }).catch((err) => console.warn("[Telegram Undo] Media cleanup notice:", err));
      }

      await answerTelegramCallbackQuery(cq.id, "Transaksi & bukti media berhasil dihapus!");
      if (chatId && messageId) {
        await editTelegramMessageText(
          chatId,
          messageId,
          "❌ *Transaksi ini telah dibatalkan & bukti media telah dibersihkan dari penyimpanan.*",
          { inline_keyboard: [] }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("prompt_wallet:")) {
      const transactionId = data.replace("prompt_wallet:", "");
      let wallets: any[] = [];
      try {
        const { data: wList } = await supabaseAdmin
          .from("wallets")
          .select("id, name")
          .eq("is_active", true);
        wallets = wList || [];
      } catch {
        wallets = [];
      }

      if (wallets && wallets.length > 0) {
        const keyboard = wallets.map((w: any) => [
          {
            text: `💳 ${w.name}`,
            callback_data: `switch_wallet:${transactionId}:${w.id}:${w.name}`,
          },
        ]);
        keyboard.push([{ text: "🔙 Batal Ubah", callback_data: "noop" }]);

        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            "Pilih dompet / rekening yang sesuai:",
            { inline_keyboard: keyboard }
          );
        }
      }
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("switch_wallet:")) {
      const [, transactionId, walletId, walletName] = data.split(":");
      try {
        await supabaseAdmin
          .from("transactions")
          .update({ wallet_id: walletId })
          .eq("id", transactionId);
      } catch (err) {
        console.warn("[Telegram] Error updating wallet in Supabase:", err);
      }

      await answerTelegramCallbackQuery(cq.id, `Dompet diubah ke ${walletName}!`);
      if (chatId && messageId) {
        await editTelegramMessageText(
          chatId,
          messageId,
          `✅ *Dompet berhasil diubah ke:* \`${walletName}\``,
          { inline_keyboard: [] }
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (data === "noop") {
      await answerTelegramCallbackQuery(cq.id);
      return NextResponse.json({ ok: true });
    }

    await answerTelegramCallbackQuery(cq.id);
    return NextResponse.json({ ok: true });
  }

  // 2. Handle Messages
  const message = body.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat?.id;
  const senderName = message.from?.first_name || "Keluarga";

  if (!chatId) {
    return NextResponse.json({ ok: true });
  }

  const taskId = `task_tg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let loadingMessageId: number | null = null;
  const startTime = Date.now();

  // 1. Anti-Spam / Rate Limiting Safeguard (Max 20 requests/minute per user)
  const rateLimit = checkRateLimit(chatId);
  if (!rateLimit.allowed) {
    await sendTelegramMessage(
      chatId,
      `⏳ *Pesan Terlalu Cepat (Flood Protection)*\n\n` +
        `Mohon tunggu ${rateLimit.remainingSeconds || 10} detik sebelum mengirim pesan berikutnya agar server tetap stabil. Terima kasih! 🙏`,
      MAIN_KEYBOARD
    );
    return NextResponse.json({ ok: true });
  }

  try {
    // Show instant typing status header
    sendTelegramChatAction(chatId, "typing").catch(() => {});

    // 2a. Resolve & Authorize Registered Family Member
    let registeredMember = await resolveRegisteredTelegramMember(chatId);
    if (!registeredMember) {
      // 1. Check if user sent native Telegram contact card
      if (message.contact && message.contact.phone_number) {
        const contact = message.contact;
        const matchedMember = await findMemberByPhoneNumber(contact.phone_number);
        if (matchedMember) {
          await linkMemberTelegram(matchedMember.id, chatId, message.from?.username);
          await sendTelegramMessage(
            chatId,
            `🎉 *Akun Keluarga Berhasil Terhubung!*\n\n` +
              `Halo *${matchedMember.full_name}*, nomor HP Anda (${contact.phone_number}) cocok dengan profil keluarga.\n\n` +
              `Akun Telegram Anda (${message.from?.username ? `@${message.from.username}` : `ID: ${chatId}`}) kini resmi aktif sebagai *${matchedMember.role === "admin" ? "Kepala Keluarga" : matchedMember.role === "spouse" ? "Pengelola" : "Anggota"}*.\n\n` +
              `Sekarang Anda dapat mencatat transaksi keuangan, mengirim foto struk kasir, dan login ke Web Dashboard.`,
            MAIN_KEYBOARD
          );
          return NextResponse.json({ ok: true });
        } else {
          await sendTelegramMessage(
            chatId,
            `⛔ *Akses Ditolak: Nomor Tidak Terdaftar*\n\n` +
              `Nomor telepon (${contact.phone_number}) belum terdaftar dalam sistem keluarga F&R Family Hub.\n\n` +
              `Silakan minta Kepala Keluarga/Admin untuk menambahkan nomor Anda terlebih dahulu di menu *Keluarga* pada Web Dashboard.`
          );
          recordChatLog({
            id: `log_tg_reject_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            channel: "telegram",
            chat_id: String(chatId),
            sender_name: senderName,
            input_type: "text",
            raw_prompt: `[Kirim Kontak: ${contact.phone_number}]`,
            status: "rejected",
            error_message: `Akses ditolak: Nomor kontak ${contact.phone_number} tidak terdaftar di database keluarga.`,
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });
          return NextResponse.json({ ok: true, dropped: true });
        }
      }

      // 2. Check if user sent /start command
      const rawText = message.text?.trim() || "";
      const isStartCmd = rawText.startsWith("/start") || rawText.toLowerCase() === "start";

      if (isStartCmd) {
        const tgUsername = message.from?.username;
        if (tgUsername) {
          const matchedMember = await findMemberByTelegramUsername(tgUsername);
          if (matchedMember) {
            await linkMemberTelegram(matchedMember.id, chatId, tgUsername);
            await sendTelegramMessage(
              chatId,
              `🎉 *Selamat Datang, ${matchedMember.full_name}!*\n\n` +
                `Akun Telegram Anda (@${tgUsername}) berhasil ditautkan secara otomatis ke profil keluarga.\n\n` +
                `Sekarang Anda dapat mencatat pengeluaran/pemasukan, mengirim struk kasir, tanya AI, dan login ke Web Dashboard.`,
              MAIN_KEYBOARD
            );
            return NextResponse.json({ ok: true });
          }
        }

        // Tampilkan sambutan ramah & tombol Hubungkan Kontak resmi
        await sendTelegramMessage(
          chatId,
          `👋 *Halo ${senderName}!*\n\n` +
            `Selamat datang di *F&R Family Assistant* 🏡.\n` +
            `Bot ini bersifat privat dan hanya dapat diakses oleh anggota keluarga terdaftar.\n\n` +
            `🆔 *ID Chat:* \`${chatId}\`\n` +
            `👤 *Username:* ${tgUsername ? `@${tgUsername}` : "_Belum disetel_"}\n\n` +
            `👉 *Cara Menghubungkan Akun:*\n` +
            `Tekan tombol *📱 Hubungkan Akun (Kirim Kontak)* di bawah ini agar bot dapat memverifikasi nomor HP Anda dengan database keluarga secara otomatis:`,
          {
            keyboard: [
              [{ text: "📱 Hubungkan Akun (Kirim Kontak)", request_contact: true }],
              [{ text: "❓ Bantuan" }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          }
        );
        return NextResponse.json({ ok: true });
      }

      // 3. Pesan selain /start dan kontak dari orang tak dikenal -> Silent Drop & Audit Log
      console.warn(`[Telegram Auth] Unauthorized access attempt from unregistered chat_id: ${chatId} (${senderName})`);
      recordChatLog({
        id: `log_tg_reject_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        channel: "telegram",
        chat_id: String(chatId),
        sender_name: senderName,
        input_type: message.photo ? "image" : message.voice || message.audio ? "audio" : "text",
        raw_prompt: message.text || message.caption || (message.photo ? "[Foto / Struk]" : "[Pesan Masuk]"),
        status: "rejected",
        error_message: `Akses ditolak: Akun Telegram (${senderName}, ID: ${chatId}) belum terdaftar sebagai anggota keluarga.`,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      return NextResponse.json({ ok: true, dropped: true });
    }

    // Auto-sync username jika anggota sudah terdaftar dan username-nya baru atau berubah
    if (message.from?.username) {
      autoSyncUsername(registeredMember.id, registeredMember.telegram_username, message.from.username);
    }

    const member = registeredMember;
    const familyId = registeredMember.family_id || "fam-001";
    const defaultWalletId = registeredMember.default_wallet_id || null;

    // 2b. Handle Quick Button / Text Commands
    const text = message.text?.trim() || "";

    // 0. Command: /myid, /id, /chatid, "cek id", "my id"
    const lowerCommand = text.toLowerCase().replace(/^\//, "").trim();
    if (
      lowerCommand === "myid" ||
      lowerCommand === "id" ||
      lowerCommand === "chatid" ||
      lowerCommand === "cek id" ||
      lowerCommand === "my id" ||
      lowerCommand.startsWith("start id")
    ) {
      const linkedInfo = member
        ? `✅ *Status Akun:* Terhubung dengan *${member.full_name}* (${member.role === "admin" ? "Kepala Keluarga" : member.role === "spouse" ? "Pengelola" : "Anggota"})`
        : `⚠️ *Status Akun:* Belum ditautkan ke anggota keluarga. Minta Admin menautkan ID ini di menu *Keluarga* pada Web Dashboard.`;

      await sendTelegramMessage(
        chatId,
        `🆔 *ID Chat Telegram Anda:*\n\n` +
          `\`${chatId}\`\n\n` +
          `👆 _Ketuk angka di atas untuk menyalin._\n\n` +
          `Gunakan ID ini untuk:\n` +
          `1️⃣ Menautkan profil di menu *Keluarga* di Web Dashboard.\n` +
          `2️⃣ Masuk / Login ke Web Dashboard pada tab Telegram.\n\n` +
          linkedInfo,
        MAIN_KEYBOARD
      );
      return NextResponse.json({ ok: true });
    }

    // 1. Command: /start, /help, /menu, ❓ Bantuan
    if (
      text === "/start" ||
      text === "/help" ||
      text === "/menu" ||
      text === "❓ Bantuan"
    ) {
      await sendTelegramMessage(
        chatId,
        `👋 Halo *${senderName}*! Selamat datang di *F&R Family Assistant* 🏡\n\n` +
          `Saya asisten keuangan keluarga Anda yang terhubung langsung dengan Web Dashboard.\n\n` +
          `🆔 *ID Chat Telegram Anda:* \`${chatId}\` _(Ketuk untuk menyalin)_\n\n` +
          `*Pilihan Aksi Cepat:* (Gunakan tombol di bawah layar)\n` +
          `• 📊 *Ringkasan Keuangan*: Total kas, pengeluaran & sisa surplus\n` +
          `• 💳 *Saldo Rekening*: Cek saldo BCA, Mandiri, Gopay, & Cash\n` +
          `• 🧾 *5 Transaksi Terakhir*: Mutasi pengeluaran terbaru\n` +
          `• 🎯 *Sisa Anggaran*: Realisasi vs batas pagu bulanan\n\n` +
          `*Cara Mencatat Transaksi Langsung:*\n` +
          `• 💬 Ketik teks: _"Beli bensin 150rb BCA"_\n` +
          `• 📸 Kirim foto struk kasir (Otomatis dibaca Gemini 3 Flash Lite)\n` +
          `• 🎙️ Kirim voice note: _"Tadi beli obat di apotek 85rb"_`,
        MAIN_KEYBOARD
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Command: 📊 Ringkasan Keuangan
    if (
      text === "📊 Ringkasan Keuangan" ||
      text === "/ringkasan" ||
      text === "/summary"
    ) {
      const data = await getFamilyFinancialData(familyId);
      const totalCash = data.wallets.reduce((acc, w) => acc + Number(w.current_balance || 0), 0);
      const surplus = data.monthlyTotalIncome - data.monthlyTotalExpense;

      let msg =
        `📊 *Ringkasan Keuangan Keluarga F&R*\n` +
        `📅 *Periode:* ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Total Saldo Kas:* \`${formatRupiah(totalCash)}\`\n` +
        `📈 *Pemasukan Bulan Ini:* \`${formatRupiah(data.monthlyTotalIncome)}\`\n` +
        `📉 *Pengeluaran Bulan Ini:* \`${formatRupiah(data.monthlyTotalExpense)}\`\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `⚖️ *Surplus / Arus Kas:* \`${formatRupiah(surplus)}\` ${surplus >= 0 ? "🟢 (Sehat)" : "🔴 (Defisit)"}\n\n` +
        `_💡 Tekan "Saldo Rekening" atau "Sisa Anggaran" untuk rincian detail._`;

      await sendTelegramMessage(chatId, msg, MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 3. Command: 💳 Saldo Rekening
    if (
      text === "💳 Saldo Rekening" ||
      text === "/saldo" ||
      text === "/wallets"
    ) {
      const data = await getFamilyFinancialData(familyId);
      const totalCash = data.wallets.reduce((acc, w) => acc + Number(w.current_balance || 0), 0);

      let msg = `💳 *Daftar Saldo Rekening & Dompet:*\n━━━━━━━━━━━━━━━━━━━\n`;
      if (data.wallets.length === 0) {
        msg += `_Belum ada rekening yang terdaftar._\n`;
      } else {
        data.wallets.forEach((w) => {
          const icon = w.type === "bank" ? "🏦" : w.type === "ewallet" ? "📱" : w.type === "investment" ? "📈" : "💵";
          msg += `${icon} *${w.name}*\n   └ Saldo: \`${formatRupiah(Number(w.current_balance || 0))}\`\n`;
        });
      }
      msg += `━━━━━━━━━━━━━━━━━━━\n💰 *Total Kas Tersedia:* \`${formatRupiah(totalCash)}\``;

      await sendTelegramMessage(chatId, msg, MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 4. Command: 🧾 5 Transaksi Terakhir
    if (
      text === "🧾 5 Transaksi Terakhir" ||
      text === "/transaksi" ||
      text === "/mutasi"
    ) {
      const data = await getFamilyFinancialData(familyId);

      if (data.recentTransactions.length === 0) {
        await sendTelegramMessage(chatId, "🧾 Belum ada transaksi yang tercatat di sistem.", MAIN_KEYBOARD);
        return NextResponse.json({ ok: true });
      }

      let msg = `🧾 *5 Transaksi Terakhir Keluarga:*\n━━━━━━━━━━━━━━━━━━━\n`;
      data.recentTransactions.slice(0, 5).forEach((t, idx) => {
        const sign = t.type === "expense" ? "🔴 -" : "🟢 +";
        const dateStr = t.transaction_date ? t.transaction_date.substring(0, 10) : "";
        msg += `${idx + 1}. *${t.description}*\n`;
        msg += `   └ ${sign}\`${formatRupiah(t.amount)}\` · ${t.category?.name || "Lain-lain"}\n`;
        msg += `   └ 💳 ${t.wallet?.name || "Dompet"} · 📅 ${dateStr}\n`;
        if (t.parsed_metadata?.items && t.parsed_metadata.items.length > 0) {
          msg += `   └ 📋 _(${t.parsed_metadata.items.length} item rincian nota)_\n`;
        }
        msg += `\n`;
      });

      await sendTelegramMessage(chatId, msg, MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 5. Command: 🎯 Sisa Anggaran
    if (
      text === "🎯 Sisa Anggaran" ||
      text === "/anggaran" ||
      text === "/budget"
    ) {
      const data = await getFamilyFinancialData(familyId);

      let msg =
        `🎯 *Status Anggaran Kategori Bulan Ini:*\n` +
        `📅 ${new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" })}\n` +
        `━━━━━━━━━━━━━━━━━━━\n`;

      if (data.budgets.length === 0) {
        msg += `_Belum ada pagu anggaran yang diset._\n`;
      } else {
        data.budgets.forEach((b) => {
          const percent = b.target > 0 ? Math.round((b.spent / b.target) * 100) : 0;
          const statusIcon = percent > 100 ? "🔴 (Over!)" : percent >= 80 ? "🟡 (Peringatan)" : "🟢 (Aman)";
          msg += `🏷️ *${b.name}*\n`;
          msg += `   └ Terpakai: \`${formatRupiah(b.spent)}\` / \`${formatRupiah(b.target)}\`\n`;
          msg += `   └ Progres: *${percent}%* ${statusIcon}\n\n`;
        });
      }
      msg += `━━━━━━━━━━━━━━━━━━━\n📉 *Total Pengeluaran:* \`${formatRupiah(data.monthlyTotalExpense)}\``;

      await sendTelegramMessage(chatId, msg, MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 6. Command: 💡 Tanya AI Keuangan / Petunjuk Tanya
    if (text === "💡 Tanya AI Keuangan" || text === "/tanya") {
      await sendTelegramMessage(
        chatId,
        `💡 *Fitur Tanya AI Finansial Aktif!*\n\n` +
          `Anda bisa langsung menanyakan kondisi keuangan keluarga dalam bahasa santai, contohnya:\n\n` +
          `• _"Berapa pengeluaran kita buat makan bulan ini?"_\n` +
          `• _"Saldo BCA masih ada berapa ya?"_\n` +
          `• _"Kemarin kita belanja apa aja di sate?"_\n` +
          `• _"Apakah anggaran bulan ini sudah overbudget?"_\n\n` +
          `Silakan ketik pertanyaan Anda sekarang! 👇`,
        MAIN_KEYBOARD
      );
      return NextResponse.json({ ok: true });
    }

    // 2c. Zero-Cost Relevance Gatekeeper (Save 100% tokens for irrelevant/out-of-domain messages)
    if (!message.photo && !message.voice && !message.audio && text) {
      const relevance = checkMessageRelevance(text, senderName);

      if (relevance.isGreeting) {
        await sendTelegramMessage(
          chatId,
          `👋 Halo *${senderName}*! Ada yang bisa saya bantu terkait pencatatan keuangan atau arsip dokumen keluarga hari ini?\n\n` +
            `Anda bisa langsung mencatat pengeluaran (teks/foto struk), cek saldo, atau pilih menu di bawah ini! 👇`,
          MAIN_KEYBOARD
        );
        return NextResponse.json({ ok: true });
      }

      if (!relevance.isRelevant) {
        await sendTelegramMessage(
          chatId,
          relevance.rejectionMessage || getPoliteRejectionMessage(senderName),
          MAIN_KEYBOARD
        );

        recordChatLog({
          id: taskId,
          channel: "telegram",
          chat_id: String(chatId),
          sender_name: senderName,
          input_type: "text",
          raw_prompt: text,
          status: "cancelled",
          error_message: "Ditolak otomatis: Pesan di luar lingkup aplikasi (Out-of-Domain Guardrail)",
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          latency_ms: Date.now() - startTime,
        });

        return NextResponse.json({ ok: true });
      }
    }

    // 2d. Identify Media Type & Register Task with 15s Timeout Safeguard
    let mediaType: "text" | "image" | "audio" = "text";
    let rawPrompt: string = text || "[Media]";

    const isPhoto = Boolean(message.photo && message.photo.length > 0);
    const isDocumentImage = Boolean(
      message.document &&
      (message.document.mime_type?.startsWith("image/") || message.document.mime_type === "application/pdf")
    );

    if (isPhoto || isDocumentImage) {
      mediaType = "image";
      rawPrompt = message.caption || (isDocumentImage ? "[Dokumen Struk]" : "[Foto Struk]");
    } else if (message.voice || message.audio) {
      mediaType = "audio";
      rawPrompt = "[Pesan Suara]";
    }

    // Register process with 15-second automatic timeout and kill switch
    registerBotProcess(
      taskId,
      {
        channel: "telegram",
        chatId,
        senderName,
        inputType: mediaType,
        rawPrompt,
      },
      {
        timeoutMs: 15000,
        onTimeout: async () => {
          if (loadingMessageId) {
            await replyOrEditLoading(
              chatId,
              loadingMessageId,
              "⚠️ *Maaf, server AI sedang mengalami antrean tinggi / respon memakan waktu terlalu lama (>15 detik).*\n\n" +
                "Proses telah dihentikan secara otomatis untuk menghemat sumber daya. Silakan coba kirim ulang beberapa saat lagi atau catat transaksi secara manual.",
              MAIN_KEYBOARD
            );
          }
        },
        onCancel: async () => {
          if (loadingMessageId) {
            await replyOrEditLoading(
              chatId,
              loadingMessageId,
              "⛔ *Proses telah dibatalkan atas permintaan pengguna.*",
              MAIN_KEYBOARD
            );
          }
        },
      }
    );

    const cancelKeyboard = [
      [{ text: "⛔ Batalkan Proses", callback_data: `cancel_task:${taskId}` }],
    ];

    let mediaInput: IngestionMediaInput | null = null;

    if (isPhoto || isDocumentImage) {
      sendTelegramChatAction(chatId, "upload_photo").catch(() => {});
      const tempMsg = await sendTelegramMessage(
        chatId,
        "📸 *Menerima foto struk...*\n⏳ _Sedang membaca data & rincian item dengan Gemini 3 Flash Lite AI..._",
        { inline_keyboard: cancelKeyboard }
      );
      if (tempMsg?.result?.message_id) {
        loadingMessageId = tempMsg.result.message_id;
        updateProcessLoadingMessage(taskId, loadingMessageId);
      }

      let fileIdToDownload = "";
      let originalName = `struk_${Date.now()}.jpg`;

      if (isPhoto) {
        const photo = message.photo[message.photo.length - 1]; // highest res
        fileIdToDownload = photo.file_id;
      } else if (isDocumentImage) {
        fileIdToDownload = message.document.file_id;
        originalName = message.document.file_name || originalName;
      }

      const downloaded = await downloadTelegramFile(fileIdToDownload);
      if (downloaded) {
        mediaInput = {
          type: "image",
          mimeType: downloaded.mimeType,
          buffer: downloaded.buffer,
          fileName: originalName,
        };
      }
    } else if (message.voice || message.audio) {
      sendTelegramChatAction(chatId, "record_voice").catch(() => {});
      const tempMsg = await sendTelegramMessage(
        chatId,
        "🎙️ *Menerima pesan suara...*\n⏳ _Sedang mentranskripsikan suara & memproses nominal dengan Gemini AI..._",
        { inline_keyboard: cancelKeyboard }
      );
      if (tempMsg?.result?.message_id) {
        loadingMessageId = tempMsg.result.message_id;
        updateProcessLoadingMessage(taskId, loadingMessageId);
      }

      const audioFile = message.voice || message.audio;
      const downloaded = await downloadTelegramFile(audioFile.file_id);
      if (downloaded) {
        mediaInput = {
          type: "audio",
          mimeType: downloaded.mimeType,
          buffer: downloaded.buffer,
        };
      }
    } else if (message.text) {
      const questionKeywords = [
        "berapa", "apakah", "sisa", "total", "kemarin", "siapa", "kapan",
        "gimana", "bagaimana", "cukup", "bisa", "kenapa", "tanya", "apa aja", "?"
      ];
      const lowerText = text.toLowerCase();
      const isQuestion =
        questionKeywords.some((kw) => lowerText.startsWith(kw) || lowerText.endsWith(kw)) ||
        lowerText.includes("?") ||
        lowerText.includes("saldo") ||
        lowerText.includes("anggaran") ||
        lowerText.includes("pengeluaran") ||
        lowerText.includes("habis berapa");

      if (isQuestion) {
        const tempMsg = await sendTelegramMessage(
          chatId,
          "🤖 *Menganalisis data keuangan Anda...*\n⏳ _Menghitung saldo, anggaran & mutasi transaksi terkini..._",
          { inline_keyboard: cancelKeyboard }
        );
        if (tempMsg?.result?.message_id) {
          loadingMessageId = tempMsg.result.message_id;
          updateProcessLoadingMessage(taskId, loadingMessageId);
        }
      }
    }

    // Call deep multimodal ingestion module
    const result = await withContinuousChatAction(chatId, "typing", async () => {
      return await ingestMultimodalInput({
        channel: "telegram",
        familyId,
        member,
        senderName,
        text: message.caption || message.text,
        media: mediaInput,
        onProgress: async (step) => {
          if (loadingMessageId) {
            await editTelegramMessageText(chatId, loadingMessageId, `⏳ _${step}_`, {
              inline_keyboard: cancelKeyboard,
            }).catch(() => {});
          }
        },
      });
    });

    if (result.status === "transaction_recorded") {
      const { transaction, categoryName, walletName, budgetStatus, parsed, driveViewUrl, usedFastPath } = result;
      const typeText = parsed.type === "expense" ? "Pengeluaran" : parsed.type === "income" ? "Pemasukan" : "Transfer";

      let replyText =
        `✅ *${typeText} Berhasil Dicatat!*\n\n` +
        (parsed.merchant_name ? `🏪 *Toko:* ${parsed.merchant_name}\n` : "") +
        `💵 *Nominal:* \`${formatRupiah(parsed.amount)}\`\n` +
        `🏷️ *Kategori:* ${categoryName}\n` +
        `💳 *Dompet:* ${walletName}\n` +
        `📝 *Catatan:* ${parsed.description}`;

      if (parsed.type === "expense" && budgetStatus && budgetStatus.targetAmount > 0) {
        const updatedTotalSpent = budgetStatus.totalSpent + parsed.amount;
        const updatedPercent = Math.round((updatedTotalSpent / budgetStatus.targetAmount) * 100);
        const isOver = updatedTotalSpent > budgetStatus.targetAmount;
        const budgetStatusTag = isOver ? "🔴 Overbudget!" : updatedPercent >= 80 ? "🟡 Peringatan (≥80%)" : "🟢 Aman";

        replyText +=
          `\n\n🎯 *Status Anggaran ${categoryName}:*\n` +
          `📊 Terpakai: \`${formatRupiah(updatedTotalSpent)}\` / \`${formatRupiah(budgetStatus.targetAmount)}\` (*${updatedPercent}%* ${budgetStatusTag})`;

        if (isOver) {
          replyText += `\n⚠️ _Peringatan: Total pengeluaran telah melebihi target anggaran bulan ini!_`;
        }
      }

      if (parsed.items && parsed.items.length > 0) {
        replyText += `\n\n🧾 *Rincian Item (${parsed.items.length}):*\n`;
        parsed.items.slice(0, 5).forEach((item: any) => {
          replyText += `• ${item.name} (${item.qty}x): ${formatRupiah(item.price)}\n`;
        });
        if (parsed.items.length > 5) {
          replyText += `_...dan ${parsed.items.length - 5} item lainnya_\n`;
        }
      }

      if (driveViewUrl) {
        if (driveViewUrl.startsWith("http")) {
          replyText += `\n📁 [Lihat Foto Struk](${driveViewUrl})`;
        } else {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:1000";
          replyText += `\n📁 [Lihat Foto Struk](${appUrl}${driveViewUrl})`;
        }
      }

      const inlineKeyboard = [
        [
          { text: "🗑️ Batalkan", callback_data: `undo:${transaction.id}` },
          { text: "💳 Ganti Dompet", callback_data: `prompt_wallet:${transaction.id}` },
        ],
      ];

      await replyOrEditLoading(chatId, loadingMessageId, replyText, { inline_keyboard: inlineKeyboard });

      await completeBotProcess(taskId, "success", undefined, {
        latencyMs: Date.now() - startTime,
        aiModel: usedFastPath ? "Fast-Path Regex (<0.8s)" : "gemini-3.5-flash-lite",
        parsedMetadata: parsed,
        transactionId: transaction.id,
      });

      return NextResponse.json({ ok: true });
    }

    if (result.status === "duplicate_skipped") {
      await replyOrEditLoading(
        chatId,
        loadingMessageId,
        `⚠️ *Transaksi Serupa Sudah Dicatat*\n\n${result.message}`,
        MAIN_KEYBOARD
      );
      await completeBotProcess(taskId, "success", undefined, {
        parsedMetadata: { duplicateSkipped: true },
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json({ ok: true });
    }

    if (result.status === "financial_qa_answered") {
      await replyOrEditLoading(
        chatId,
        loadingMessageId,
        `🤖 *Jawaban F&R Assistant:*\n\n${result.answer}`,
        MAIN_KEYBOARD
      );
      await completeBotProcess(taskId, "success", undefined, {
        latencyMs: Date.now() - startTime,
        aiModel: "gemini-3.5-flash-lite",
      });
      return NextResponse.json({ ok: true });
    }

    if (result.status === "unrecognized") {
      await replyOrEditLoading(
        chatId,
        loadingMessageId,
        `🤔 ${result.message}`,
        MAIN_KEYBOARD
      );
      await completeBotProcess(taskId, "failed", "Nominal transaksi tidak terdeteksi", {
        latencyMs: Date.now() - startTime,
      });
      return NextResponse.json({ ok: true });
    }

    // status: "error"
    await replyOrEditLoading(
      chatId,
      loadingMessageId,
      `⚠️ ${result.error}`,
      MAIN_KEYBOARD
    );
    await completeBotProcess(taskId, "failed", result.error, {
      latencyMs: Date.now() - startTime,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Unhandled error in Telegram webhook:", err);
    await completeBotProcess(taskId, "failed", err.message || "Unknown error", {
      latencyMs: Date.now() - startTime,
    });

    // Human-friendly non-AI fallback response
    await replyOrEditLoading(
      chatId,
      loadingMessageId,
      "⚠️ *Layanan AI sedang mengalami kendala teknis sementara (High Demand / Gangguan Jaringan).*\n\n" +
        "Transaksi belum tersimpan. Silakan coba sesaat lagi atau gunakan pencatatan manual via Web Dashboard.",
      MAIN_KEYBOARD
    );
    return NextResponse.json({ ok: true });
  }
}
