import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  parseFinancialInputWithGemini,
  answerFinancialQuestionWithGemini,
} from "@/lib/gemini/parser";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { appendTransactionToSheet } from "@/lib/google/sheets";
import {
  sendTelegramMessage,
  editTelegramMessageText,
  answerTelegramCallbackQuery,
  downloadTelegramFile,
  sendTelegramChatAction,
  deleteTelegramMessage,
  withContinuousChatAction,
} from "@/lib/telegram/bot";
import { formatRupiah, formatDateIndo } from "@/lib/utils";

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

  const currentMonth = new Date().toISOString().substring(0, 7);

  // Helper to fetch live financial data for a family
  const getFamilyFinancialData = async (familyId: string) => {
    const { data: wallets } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("family_id", familyId)
      .eq("type", "expense");

    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("family_id", familyId)
      .eq("month_year", currentMonth);

    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
      .eq("family_id", familyId)
      .order("transaction_date", { ascending: false })
      .limit(10);

    const { data: monthlyTx } = await supabaseAdmin
      .from("transactions")
      .select("category_id, amount, type")
      .eq("family_id", familyId)
      .gte("transaction_date", `${currentMonth}-01T00:00:00.000Z`)
      .lte("transaction_date", `${currentMonth}-31T23:59:59.999Z`);

    const spentMap: Record<string, number> = {};
    let monthlyTotalExpense = 0;
    let monthlyTotalIncome = 0;

    if (monthlyTx) {
      monthlyTx.forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.type === "expense") {
          monthlyTotalExpense += amt;
          if (tx.category_id) {
            spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + amt;
          }
        } else if (tx.type === "income") {
          monthlyTotalIncome += amt;
        }
      });
    }

    const budgetItems = (categories || []).map((cat) => {
      const b = budgets?.find((item) => item.category_id === cat.id);
      return {
        id: b?.id || cat.id,
        category_id: cat.id,
        name: cat.name,
        spent: spentMap[cat.id] || 0,
        target: b ? Number(b.target_amount) : 0,
      };
    });

    return {
      wallets: wallets || [],
      budgets: budgetItems,
      recentTransactions: transactions || [],
      monthlyTotalExpense,
      monthlyTotalIncome,
    };
  };

  // 1. Handle Callback Query (Inline Keyboard Actions)
  if (body.callback_query) {
    const cq = body.callback_query;
    const chatId = cq.message?.chat?.id;
    const messageId = cq.message?.message_id;
    const data = cq.data as string;

    if (chatId) {
      sendTelegramChatAction(chatId, "typing").catch(() => {});
    }

    if (data.startsWith("undo:")) {
      const transactionId = data.replace("undo:", "");
      const { error } = await supabaseAdmin.from("transactions").delete().eq("id", transactionId);

      if (error) {
        await answerTelegramCallbackQuery(cq.id, "Gagal membatalkan transaksi.");
      } else {
        await answerTelegramCallbackQuery(cq.id, "Transaksi berhasil dibatalkan & dihapus!");
        if (chatId && messageId) {
          await editTelegramMessageText(
            chatId,
            messageId,
            "❌ *Transaksi ini telah dibatalkan & dihapus dari database.*",
            { inline_keyboard: [] }
          );
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith("prompt_wallet:")) {
      const transactionId = data.replace("prompt_wallet:", "");
      const { data: wallets } = await supabaseAdmin
        .from("wallets")
        .select("id, name")
        .eq("is_active", true);

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
      await supabaseAdmin
        .from("transactions")
        .update({ wallet_id: walletId })
        .eq("id", transactionId);

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

  try {
    // Show instant typing status header
    sendTelegramChatAction(chatId, "typing").catch(() => {});

    // 2a. Resolve Family ID
    const { data: member } = await supabaseAdmin
      .from("family_members")
      .select("*, family:families(*)")
      .eq("telegram_chat_id", chatId)
      .maybeSingle();

    let familyId: string | null = member?.family_id || null;
    let defaultWalletId: string | null = member?.default_wallet_id || null;

    if (!familyId) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      if (families && families.length > 0) {
        familyId = families[0].id;
      } else {
        const { data: newFamily } = await supabaseAdmin
          .from("families")
          .insert({ name: "Keluarga F&R", currency: "IDR" })
          .select()
          .single();
        familyId = newFamily?.id || null;
      }
    }

    if (!familyId) {
      await sendTelegramMessage(chatId, "⚠️ Keluarga belum terdaftar.", MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 2b. Handle Quick Button / Text Commands
    const text = message.text?.trim() || "";

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
          `*Pilihan Aksi Cepat:* (Gunakan tombol di bawah layar)\n` +
          `• 📊 *Ringkasan Keuangan*: Total kas, pengeluaran & sisa surplus\n` +
          `• 💳 *Saldo Rekening*: Cek saldo BCA, Mandiri, Gopay, & Cash\n` +
          `• 🧾 *5 Transaksi Terakhir*: Mutasi pengeluaran terbaru\n` +
          `• 🎯 *Sisa Anggaran*: Realisasi vs batas pagu bulanan\n\n` +
          `*Cara Mencatat Transaksi Langsung:*\n` +
          `• 💬 Ketik teks: _"Beli bensin 150rb BCA"_\n` +
          `• 📸 Kirim foto struk kasir (Otomatis dibaca Gemini AI OCR)\n` +
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

    // 2c. Check if User is Asking a Natural Language Financial Question
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

    // 2d. Identify Input Type (Photo, Voice, or Financial Recording / Question)
    let parsed: any = null;
    let mediaType: "text" | "image" | "audio" = "text";
    let driveFileId: string | null = null;
    let driveViewUrl: string | null = null;
    let rawPrompt: string = "";
    let loadingMessageId: number | null = null;

    if (message.photo && message.photo.length > 0) {
      mediaType = "image";
      rawPrompt = message.caption || "[Foto Struk]";
      
      // Trigger header action and instant loading message
      sendTelegramChatAction(chatId, "upload_photo").catch(() => {});
      const tempMsg = await sendTelegramMessage(
        chatId,
        "📸 *Menerima foto struk...*\n⏳ _Sedang membaca data & rincian item dengan Gemini 3.7 Flash AI..._"
      );
      if (tempMsg?.result?.message_id) {
        loadingMessageId = tempMsg.result.message_id;
      }

      const photo = message.photo[message.photo.length - 1]; // highest res
      const downloaded = await downloadTelegramFile(photo.file_id);

      if (downloaded) {
        // Upload to Google Drive if configured
        const driveResult = await uploadReceiptToDrive(
          downloaded.buffer,
          `struk_${Date.now()}.jpg`,
          downloaded.mimeType
        );
        if (driveResult) {
          driveFileId = driveResult.fileId;
          driveViewUrl = driveResult.webViewLink;
        }

        // Parse with Gemini 3.7 Flash with continuous typing pulse
        parsed = await withContinuousChatAction(chatId, "typing", async () => {
          return await parseFinancialInputWithGemini({
            text: message.caption,
            imageBuffer: downloaded.buffer,
            imageMimeType: downloaded.mimeType,
          });
        });
      }
    } else if (message.voice || message.audio) {
      mediaType = "audio";

      // Trigger header action and instant loading message
      sendTelegramChatAction(chatId, "record_voice").catch(() => {});
      const tempMsg = await sendTelegramMessage(
        chatId,
        "🎙️ *Menerima pesan suara...*\n⏳ _Sedang mentranskripsikan suara & memproses nominal dengan Gemini AI..._"
      );
      if (tempMsg?.result?.message_id) {
        loadingMessageId = tempMsg.result.message_id;
      }

      const audioFile = message.voice || message.audio;
      const downloaded = await downloadTelegramFile(audioFile.file_id);

      if (downloaded) {
        parsed = await withContinuousChatAction(chatId, "typing", async () => {
          return await parseFinancialInputWithGemini({
            audioBuffer: downloaded.buffer,
            audioMimeType: downloaded.mimeType,
          });
        });
        rawPrompt = parsed?.transcription || "[Pesan Suara]";
      }
    } else if (message.text) {
      rawPrompt = message.text;

      // If it is a conversational financial question, handle with Gemini AI Q&A
      if (isQuestion) {
        const tempMsg = await sendTelegramMessage(
          chatId,
          "🤖 *Menganalisis data keuangan Anda...*\n⏳ _Menghitung saldo, anggaran & mutasi transaksi terkini..._"
        );
        if (tempMsg?.result?.message_id) {
          loadingMessageId = tempMsg.result.message_id;
        }

        // Continuous typing indicator in chat header until Gemini finishes
        const aiAnswer = await withContinuousChatAction(chatId, "typing", async () => {
          const finData = await getFamilyFinancialData(familyId);
          return await answerFinancialQuestionWithGemini(message.text, finData);
        });

        // Smooth in-place edit: loading message transforms directly into final AI answer!
        await replyOrEditLoading(
          chatId,
          loadingMessageId,
          `🤖 *Jawaban F&R Assistant:*\n\n${aiAnswer}`,
          MAIN_KEYBOARD
        );
        return NextResponse.json({ ok: true });
      }

      // Fast typing feedback for transaction text
      parsed = await withContinuousChatAction(chatId, "typing", async () => {
        return await parseFinancialInputWithGemini({ text: message.text });
      });
    }

    if (!parsed || !parsed.amount || parsed.amount <= 0) {
      // If unable to parse transaction, try answering as conversational prompt
      if (message.text) {
        const aiAnswer = await withContinuousChatAction(chatId, "typing", async () => {
          const finData = await getFamilyFinancialData(familyId);
          return await answerFinancialQuestionWithGemini(message.text, finData);
        });
        await replyOrEditLoading(chatId, loadingMessageId, `🤖 *F&R Assistant:*\n\n${aiAnswer}`, MAIN_KEYBOARD);
        return NextResponse.json({ ok: true });
      }

      await replyOrEditLoading(
        chatId,
        loadingMessageId,
        "🤔 Maaf, saya belum bisa mengenali transaksi dari input tersebut. Silakan ketik nominal yang jelas (contoh: *Beli makan siang 35rb*) atau kirim foto struk.",
        MAIN_KEYBOARD
      );
      return NextResponse.json({ ok: true });
    }

    // 2e. Match Wallet
    const { data: wallets } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("family_id", familyId)
      .eq("is_active", true);

    let chosenWallet = wallets?.find((w: any) =>
      parsed.wallet_hint && w.name.toLowerCase().includes(parsed.wallet_hint.toLowerCase())
    );

    if (!chosenWallet && defaultWalletId) {
      chosenWallet = wallets?.find((w: any) => w.id === defaultWalletId);
    }

    if (!chosenWallet && wallets && wallets.length > 0) {
      chosenWallet = wallets[0];
    }

    if (!chosenWallet) {
      const { data: newWallet } = await supabaseAdmin
        .from("wallets")
        .insert({
          family_id: familyId,
          name: "Dompet Tunai",
          type: "cash",
          current_balance: 0,
        })
        .select()
        .single();
      chosenWallet = newWallet;
    }

    // 2f. Match or Create Category
    let categoryId: string | null = null;
    if (parsed.category) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("family_id", familyId)
        .ilike("name", `%${parsed.category}%`)
        .maybeSingle();

      if (cat) {
        categoryId = cat.id;
      } else {
        const { data: newCat } = await supabaseAdmin
          .from("categories")
          .insert({
            family_id: familyId,
            name: parsed.category,
            type: parsed.type === "income" ? "income" : "expense",
          })
          .select()
          .single();
        categoryId = newCat?.id || null;
      }
    }

    // 2g. Insert Transaction into Supabase
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        family_id: familyId,
        member_id: member?.id || null,
        wallet_id: chosenWallet.id,
        category_id: categoryId,
        type: parsed.type,
        amount: parsed.amount,
        description: parsed.description,
        raw_prompt: rawPrompt,
        media_type: mediaType,
        drive_file_id: driveFileId,
        drive_view_url: driveViewUrl,
        parsed_metadata: {
          merchant: parsed.merchant_name,
          items: parsed.items,
          confidence: parsed.confidence,
          transcription: parsed.transcription,
        },
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error("Failed to insert transaction:", txError);
      await replyOrEditLoading(chatId, loadingMessageId, "⚠️ Terjadi kesalahan saat menyimpan ke database.", MAIN_KEYBOARD);
      return NextResponse.json({ ok: true });
    }

    // 2h. Real-time Append to Google Sheets
    appendTransactionToSheet({
      transactionDate: new Date().toISOString().split("T")[0],
      type: parsed.type,
      category: parsed.category || "Lain-lain",
      amount: parsed.amount,
      walletName: chosenWallet.name,
      description: parsed.description,
      memberName: member?.full_name || senderName,
      driveLink: driveViewUrl || undefined,
    }).catch((err) => console.error("Async Google Sheet Sync Error:", err));

    // 2i. Reply Confirmation Message with Action Buttons
    const typeText = parsed.type === "expense" ? "Pengeluaran" : parsed.type === "income" ? "Pemasukan" : "Transfer";

    let replyText =
      `✅ *${typeText} Berhasil Dicatat!*\n\n` +
      `💵 *Nominal:* \`${formatRupiah(parsed.amount)}\`\n` +
      `🏷️ *Kategori:* ${parsed.category || "Lain-lain"}\n` +
      `💳 *Dompet:* ${chosenWallet.name}\n` +
      `📝 *Catatan:* ${parsed.description}`;

    if (parsed.items && parsed.items.length > 0) {
      replyText += `\n\n🧾 *Rincian Item (${parsed.items.length}):*\n`;
      parsed.items.slice(0, 5).forEach((item: any) => {
        replyText += `• ${item.name} (${item.qty}x) — ${formatRupiah(item.price)}\n`;
      });
      if (parsed.items.length > 5) {
        replyText += `_...dan ${parsed.items.length - 5} item lainnya_\n`;
      }
    }

    if (driveViewUrl) {
      replyText += `\n📁 [Buka Foto di Google Drive](${driveViewUrl})`;
    }

    const inlineKeyboard = [
      [
        { text: "🗑️ Batalkan", callback_data: `undo:${transaction.id}` },
        { text: "💳 Ganti Dompet", callback_data: `prompt_wallet:${transaction.id}` },
      ],
    ];

    // Smooth transition: in-place transform loading message directly into the receipt!
    await replyOrEditLoading(chatId, loadingMessageId, replyText, { inline_keyboard: inlineKeyboard });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unhandled error in Telegram webhook:", err);
    await sendTelegramMessage(
      chatId,
      "⚠️ Terjadi gangguan saat memproses pesan. Mohon coba beberapa saat lagi.",
      MAIN_KEYBOARD
    );
    return NextResponse.json({ ok: true });
  }
}
