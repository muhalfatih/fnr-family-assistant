import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { deleteReceiptMedia } from "@/lib/storage/r2";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppInteractiveButtons,
  downloadWhatsAppMedia,
  markWhatsAppMessageAsRead,
  normalizeWhatsAppNumber,
} from "@/lib/whatsapp/client";
import {
  registerBotProcess,
  completeBotProcess,
  recordChatLog,
} from "@/lib/bot/process-manager";
import { checkMessageRelevance, checkRateLimit, getPoliteRejectionMessage } from "@/lib/bot/relevance-guard";
import { formatRupiah, formatDateIndo } from "@/lib/utils";
import { whatsAppConfig, getReceiptAckMessage, getAudioAckMessage } from "@/lib/whatsapp/config";
import { isWebhookDuplicate } from "@/lib/bot/idempotency";
import {
  ingestMultimodalInput,
  getFamilyFinancialContext,
  IngestionMediaInput,
} from "@/lib/ingestion/multimodal-ingestor";

// Standard quick action buttons for WhatsApp interactive messages
const DEFAULT_WHATSAPP_BUTTONS = [
  { id: "action_summary", title: "📊 Ringkasan" },
  { id: "action_balance", title: "💳 Saldo Rekening" },
  { id: "action_budget", title: "🎯 Sisa Anggaran" },
];

/**
 * GET Handler for Meta Webhook Verification
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || process.env.TELEGRAM_WEBHOOK_SECRET || "fnr_family_whatsapp_secret";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[WhatsApp Webhook] Webhook verified successfully by Meta.");
    return new Response(challenge || "", { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden: verification token mismatch" }, { status: 403 });
}


// Live financial context provider from multimodal ingestion module
const getFamilyFinancialData = getFamilyFinancialContext;

/**
 * POST Handler: Processes incoming messages from WhatsApp Cloud API
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Meta expects an immediate 200 OK to acknowledge receipt
  if (!body || body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const entries = body.entry || [];
  for (const entry of entries) {
    const changes = entry.changes || [];
    for (const change of changes) {
      const value = change.value;
      if (!value || !value.messages || value.messages.length === 0) continue;

      const contact = value.contacts?.[0];
      const message = value.messages[0];

      if (!message || !message.from) continue;

      const senderPhone = message.from;
      const senderName = contact?.profile?.name || senderPhone;
      const messageId = message.id;

      // Lapis 1: Webhook Idempotency Check (Pencegah Retry Storm dari Meta WhatsApp)
      if (messageId && isWebhookDuplicate(`wa_msg_${messageId}`)) {
        console.log(`[WhatsApp] Dropping duplicate webhook retry for messageId: ${messageId}`);
        continue;
      }

      // Mark message as read
      if (messageId) {
        markWhatsAppMessageAsRead(messageId).catch(() => {});
      }

      // Await message processing directly so Next.js event loop executes immediately
      try {
        await processWhatsAppMessage(senderPhone, senderName, message, messageId);
      } catch (err) {
        console.error("[WhatsApp] Error processing message:", err);
      }
    }
  }

  return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
}

/**
 * Helper to strictly authorize registered WhatsApp family members
 */
async function resolveRegisteredWhatsAppMember(normalizedPhone: string) {
  if (!normalizedPhone) return null;
  const cleanWithoutCountry = normalizedPhone.replace(/^62/, "");

  try {
    const { data: memberRows, error: memberErr } = await supabaseAdmin
      .from("family_members")
      .select("*, family:families(*)")
      .or(
        `whatsapp_number.eq.${normalizedPhone},whatsapp_number.eq.0${cleanWithoutCountry},whatsapp_number.eq.+${normalizedPhone},whatsapp_number.eq.${cleanWithoutCountry}`
      )
      .limit(5);

    if (memberErr) {
      console.warn("[WhatsApp Auth] Member lookup warning:", memberErr.message);
    }
    if (memberRows && memberRows.length > 0) {
      // Prioritize member with 'whatsapp' in full_name, or return first
      const preferred = memberRows.find((m: any) =>
        m.full_name?.toLowerCase().includes("whatsapp")
      );
      return preferred || memberRows[0];
    }
    return null;
  } catch (err) {
    console.error("[WhatsApp Auth] Member lookup exception:", err);
    return null;
  }
}

/**
 * Core processing logic for an inbound WhatsApp message
 */
async function processWhatsAppMessage(
  senderPhone: string,
  senderName: string,
  message: any,
  messageId: string
) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const normalizedPhone = normalizeWhatsAppNumber(senderPhone);

  // 1. Rate Limit Safeguard
  const rateLimit = checkRateLimit(normalizedPhone);
  if (!rateLimit.allowed) {
    await sendWhatsAppTextMessage(
      senderPhone,
      "⏳ Mohon tunggu sebentar, Anda mengirim pesan terlalu cepat. Silakan coba kembali dalam beberapa detik."
    );
    return;
  }

  // 2. Authorize Sender: Only registered WhatsApp numbers are allowed
  const registeredMember = await resolveRegisteredWhatsAppMember(normalizedPhone);
  if (!registeredMember) {
    console.warn(`[WhatsApp Auth] Unauthorized access attempt from unregistered phone: ${senderPhone} (${senderName})`);

    const rawContentPreview =
      message.type === "text"
        ? message.text?.body || "[Pesan Teks]"
        : message.type === "image"
        ? "[Foto / Struk WhatsApp]"
        : message.type === "audio" || message.type === "voice"
        ? "[Pesan Suara / Voice Note]"
        : "[Pesan WhatsApp]";

    // Security Audit Log to /logs
    recordChatLog({
      id: `log_wa_reject_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channel: "whatsapp",
      chat_id: normalizedPhone,
      sender_name: senderName || "Pengguna WhatsApp",
      input_type:
        message.type === "image"
          ? "image"
          : message.type === "audio" || message.type === "voice"
          ? "audio"
          : "text",
      raw_prompt: rawContentPreview,
      status: "rejected",
      error_message: `Akses ditolak: Nomor WhatsApp ${senderPhone} belum terdaftar sebagai anggota keluarga.`,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });

    // Silent drop / ignore (no reply sent)
    return;
  }

  const member = registeredMember;
  const familyId = registeredMember.family_id || "fam-001";
  const defaultWalletId = registeredMember.default_wallet_id || null;

  // 3. Extract Message Text / Action
  const msgType = message.type;
  let text = "";
  let actionId = "";

  if (msgType === "text") {
    text = message.text?.body?.trim() || "";
  } else if (msgType === "interactive") {
    if (message.interactive?.type === "button_reply") {
      actionId = message.interactive.button_reply?.id || "";
      text = message.interactive.button_reply?.title || "";
    } else if (message.interactive?.type === "list_reply") {
      actionId = message.interactive.list_reply?.id || "";
      text = message.interactive.list_reply?.title || "";
    }
  }

  // 4. Register Bot Process Safeguard & Initial Processing Log
  const taskId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputType = msgType === "image" ? "image" : msgType === "audio" ? "audio" : actionId ? "command" : "text";

  registerBotProcess(
    taskId,
    {
      channel: "whatsapp",
      chatId: senderPhone,
      senderName,
      inputType,
      rawPrompt: text || `[Media WhatsApp ${msgType}]`,
    },
    {
      timeoutMs: 15000,
      onTimeout: async () => {
        try {
          await sendWhatsAppTextMessage(
            senderPhone,
            "⏳ Permintaan sedang membutuhkan waktu lebih lama. Sistem tetap memproses pencatatan transaksi Anda di latar belakang."
          );
        } catch (e) {
          console.error("Failed to send WhatsApp timeout notification:", e);
        }
      },
    }
  );

  // Send Instant Acknowledgment (<400ms) for heavy media inputs to eliminate silence
  if (whatsAppConfig.enableInstantAck) {
    if (msgType === "image") {
      sendWhatsAppTextMessage(senderPhone, getReceiptAckMessage()).catch((e) => {
        console.error("[WhatsApp] Error sending receipt instant ack:", e);
      });
    } else if (msgType === "audio") {
      sendWhatsAppTextMessage(senderPhone, getAudioAckMessage()).catch((e) => {
        console.error("[WhatsApp] Error sending audio instant ack:", e);
      });
    }
  }

  // 5. Handle Quick Actions / Menu Commands
  const lowerText = text.toLowerCase();

  // 5a. Summary Action
  if (actionId === "action_summary" || lowerText.includes("ringkasan") || lowerText === "summary") {
    const data = await getFamilyFinancialData(familyId);
    const netCashflow = data.monthlyTotalIncome - data.monthlyTotalExpense;
    const summaryMsg =
      `📊 *RINGKASAN KEUANGAN BULAN INI*\n` +
      `📅 Periode: ${currentMonth}\n\n` +
      `🟢 Total Pemasukan: *${formatRupiah(data.monthlyTotalIncome)}*\n` +
      `🔴 Total Pengeluaran: *${formatRupiah(data.monthlyTotalExpense)}*\n` +
      `💰 Arus Kas Bersih: *${netCashflow >= 0 ? "+" : ""}${formatRupiah(netCashflow)}*\n\n` +
      `_Ketik 'saldo' untuk rincian dompet atau kirim struk belanja untuk dicatat otomatis._`;

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      summaryMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "F&R Family Hub"
    );

    completeBotProcess(taskId, "success", undefined, {
      aiModel: "Cashflow Engine",
      parsedMetadata: { action: "summary", month: currentMonth, income: data.monthlyTotalIncome, expense: data.monthlyTotalExpense },
    });
    return;
  }

  // 5b. Balance Action
  if (actionId === "action_balance" || lowerText.includes("saldo") || lowerText === "rekening") {
    const data = await getFamilyFinancialData(familyId);
    let totalBalance = 0;
    let walletListText = "";

    data.wallets.forEach((w) => {
      totalBalance += Number(w.current_balance);
      walletListText += `💳 *${w.name}*: ${formatRupiah(Number(w.current_balance))}\n`;
    });

    const balanceMsg =
      `💳 *SALDO REKENING & DOMPET KELUARGA*\n\n` +
      (walletListText || "_Belum ada dompet aktif._\n") +
      `\n💵 *Total Saldo Keseluruhan: ${formatRupiah(totalBalance)}*`;

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      balanceMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "F&R Family Hub"
    );

    completeBotProcess(taskId, "success", undefined, {
      aiModel: "Multi-Wallet Engine",
      parsedMetadata: { action: "balance", totalBalance, walletCount: data.wallets.length },
    });
    return;
  }

  // 5c. Budget Action
  if (actionId === "action_budget" || lowerText.includes("anggaran") || lowerText === "budget") {
    const data = await getFamilyFinancialData(familyId);
    let budgetText = "";

    data.budgets.forEach((b: any) => {
      const catName = b.category?.name || b.name || "Kategori";
      const spent = Number(b.spent || 0);
      const target = Number(b.target_amount || b.target || 0);
      const percent = target > 0 ? Math.round((spent / target) * 100) : 0;
      const sisa = target - spent;

      budgetText += `🎯 *${catName}*\n   Tercatat: ${formatRupiah(spent)} / ${formatRupiah(target)} (${percent}%)\n   Sisa: *${sisa >= 0 ? formatRupiah(sisa) : `Terlampaui ${formatRupiah(Math.abs(sisa))}`}*\n\n`;
    });

    const budgetMsg =
      `🎯 *SISA PAGU ANGGARAN BULAN INI*\n\n` +
      (budgetText || "_Belum ada pagu anggaran diatur untuk bulan ini._\n");

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      budgetMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "F&R Family Hub"
    );

    completeBotProcess(taskId, "success", undefined, {
      aiModel: "Budget Allocation Engine",
      parsedMetadata: { action: "budget", budgetCount: data.budgets.length },
    });
    return;
  }

  // 5d. Help Action
  if (actionId === "action_help" || lowerText === "bantuan" || lowerText === "help" || lowerText === "halo" || lowerText === "hi") {
    const helpMsg =
      `👋 *Halo, ${senderName}! Selamat Datang di F&R Family Hub WhatsApp*\n\n` +
      `Saya asisten keuangan & legalitas keluarga berbasis AI. Anda dapat langsung mengirimkan:\n\n` +
      `1️⃣ *Pesan Teks Transaksi*\n` +
      `   _Contoh: 'Beli beras 120rb pake BCA'_\n` +
      `   _Contoh: 'Bensin motor 35k tunai'_\n\n` +
      `2️⃣ *Foto Struk Belanja*\n` +
      `   _Kirim foto nota supermarket/restoran, AI akan otomatis membaca rincian item, toko, total, dan mengarsipkan buktinya._\n\n` +
      `3️⃣ *Pesan Suara (Voice Note)*\n` +
      `   _Rekam dan kirim suara Anda saat belanja._\n\n` +
      `4️⃣ *Tanya Keuangan & Dokumen Legalitas*\n` +
      `   _Contoh: 'Berapa total belanja saya minggu ini?'_\n` +
      `   _Contoh: 'Kapan STNK mobil habis?' atau 'Cek berkas'_`;

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      helpMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "Panduan Penggunaan"
    );

    completeBotProcess(taskId, "success", undefined, {
      aiModel: "System Assistant Guide",
      parsedMetadata: { action: "help" },
    });
    return;
  }

  // 5e. Document Vault / Expiry Status Action
  if (
    actionId === "action_vault" ||
    lowerText === "dokumen" ||
    lowerText === "berkas" ||
    lowerText === "cek dokumen" ||
    lowerText === "cek berkas" ||
    lowerText === "brankas" ||
    lowerText.includes("stnk") ||
    lowerText.includes("sim") ||
    lowerText.includes("paspor") ||
    lowerText.includes("pajak") ||
    lowerText.includes("kedaluwarsa") ||
    lowerText.includes("kapan habis")
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("family_id", familyId);

    if (!docs || docs.length === 0) {
      await sendWhatsAppInteractiveButtons(
        senderPhone,
        `📁 *BRANKAS DOKUMEN KELUARGA*\n\n_Belum ada berkas atau dokumen yang diarsipkan di brankas keluarga._`,
        DEFAULT_WHATSAPP_BUTTONS,
        "Brankas Dokumen"
      );
      completeBotProcess(taskId, "success", undefined, {
        aiModel: "Vault Legal Engine",
        parsedMetadata: { action: "vault", documentCount: 0 },
      });
      return;
    }

    // If query mentions a specific keyword (e.g. STNK, SIM, Paspor)
    const specificKeyword = ["stnk", "sim", "paspor", "pajak", "bpjs", "ijazah", "sertifikat"].find(
      (k) => lowerText.includes(k)
    );

    let targetDocs = docs;
    if (specificKeyword) {
      const filtered = docs.filter(
        (d: any) =>
          d.title.toLowerCase().includes(specificKeyword) ||
          (d.document_number && d.document_number.toLowerCase().includes(specificKeyword))
      );
      if (filtered.length > 0) {
        targetDocs = filtered;
      }
    }

    let docListText = "";
    targetDocs.slice(0, 7).forEach((d: any, idx: number) => {
      let statusBadge = "🟢 *AKTIF*";
      let expInfo = "";

      if (d.is_permanent || !d.expiry_date) {
        statusBadge = "📁 *PERMANEN*";
        expInfo = "Masa berlaku seumur hidup";
      } else {
        const exp = new Date(d.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          statusBadge = "🔴 *KEDALUWARSA*";
          expInfo = `Kedaluwarsa ${Math.abs(diffDays)} hari lalu (${formatDateIndo(d.expiry_date)})`;
        } else if (diffDays <= (d.reminder_days_before || 30)) {
          statusBadge = "🟡 *SEGERA HABIS*";
          expInfo = `Jatuh tempo dlm ${diffDays} hari (${formatDateIndo(d.expiry_date)})`;
        } else {
          statusBadge = "🟢 *AKTIF*";
          expInfo = `Berlaku s/d ${formatDateIndo(d.expiry_date)} (${diffDays} hari lagi)`;
        }
      }

      docListText += `${idx + 1}. *${d.title}*\n`;
      docListText += `   └ Status: ${statusBadge}\n`;
      docListText += `   └ Info: ${expInfo}\n`;
      if (d.document_number) {
        docListText += `   └ No: ${d.document_number}\n`;
      }
      docListText += `\n`;
    });

    const vaultMsg =
      `📁 *STATUS DOKUMEN & LEGALITAS KELUARGA*\n` +
      `📅 Per Tanggal: ${formatDateIndo(new Date())}\n` +
      `━━━━━━━━━━━━━━━━━━━\n\n` +
      docListText +
      `━━━━━━━━━━━━━━━━━━━\n` +
      `_💡 Pengingat otomatis akan dikirim ke WhatsApp saat masa berlaku dokumen mendekati jatuh tempo._`;

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      vaultMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "Brankas Dokumen"
    );

    completeBotProcess(taskId, "success", undefined, {
      aiModel: "Vault Legal Engine",
      parsedMetadata: { action: "vault", documentCount: targetDocs.length },
    });
    return;
  }

  // 5e. Undo / Cancel Last Transaction Action
  if (
    actionId?.startsWith("undo_") ||
    lowerText === "batal" ||
    lowerText === "batalkan" ||
    lowerText === "undo" ||
    lowerText === "hapus transaksi terakhir"
  ) {
    let targetTxId: string | null = actionId?.startsWith("undo_") ? actionId.replace("undo_", "") : null;
    let targetTx: any = null;

    if (isSupabaseConfigured()) {
      if (targetTxId) {
        const { data: tx } = await supabaseAdmin
          .from("transactions")
          .select("id, description, amount, drive_file_id, drive_view_url, media_url")
          .eq("id", targetTxId)
          .maybeSingle();
        targetTx = tx;
      } else {
        const { data: txList } = await supabaseAdmin
          .from("transactions")
          .select("id, description, amount, drive_file_id, drive_view_url, media_url")
          .eq("family_id", familyId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (txList && txList.length > 0) {
          targetTx = txList[0];
          targetTxId = targetTx.id;
        }
      }

      if (targetTxId) {
        await supabaseAdmin.from("transactions").delete().eq("id", targetTxId);
      }
    }

    if (targetTx) {
      // Clean up media storage (R2 / Local)
      if (targetTx.drive_file_id || targetTx.drive_view_url || targetTx.media_url) {
        deleteReceiptMedia({
          fileId: targetTx.drive_file_id,
          viewUrl: targetTx.drive_view_url,
          mediaUrl: targetTx.media_url,
        }).catch((err) => console.warn("[WhatsApp Undo] Storage cleanup notice:", err));
      }

      const desc = targetTx.description || "Transaksi";
      const amtStr = targetTx.amount ? ` (${formatRupiah(targetTx.amount)})` : "";
      completeBotProcess(taskId, "success");
      await sendWhatsAppTextMessage(
        senderPhone,
        `❌ *Transaksi "${desc}"${amtStr} berhasil dibatalkan dan bukti media telah dibersihkan dari penyimpanan.*`
      );
      return;
    } else {
      completeBotProcess(taskId, "success");
      await sendWhatsAppTextMessage(
        senderPhone,
        "⚠️ Tidak ada transaksi terbaru yang dapat dibatalkan."
      );
      return;
    }
  }

  try {
    // 6. Relevance Guard for Pure Text Messages
    if (msgType === "text" && text) {
      const relevance = checkMessageRelevance(text, senderName);
      if (!relevance.isRelevant) {
        const rejectionMsg = getPoliteRejectionMessage(senderName);
        completeBotProcess(taskId, "failed", "Pesan di luar cakupan finansial");
        await sendWhatsAppTextMessage(senderPhone, rejectionMsg);
        return;
      }
    }

    // 7. Prepare Media Input
    let mediaInput: IngestionMediaInput | null = null;

    if (msgType === "image") {
      const mediaId = message.image?.id;
      if (!mediaId) {
        completeBotProcess(taskId, "failed", "ID media gambar tidak ditemukan.");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mengunduh gambar struk. Silakan coba kirim ulang foto.");
        return;
      }

      const media = await downloadWhatsAppMedia(mediaId);
      if (!media) {
        completeBotProcess(taskId, "failed", "Gagal mengunduh gambar dari WhatsApp server.");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mengunduh file gambar dari server WhatsApp.");
        return;
      }

      mediaInput = {
        type: "image",
        mimeType: media.mimeType || "image/jpeg",
        buffer: media.buffer,
        fileName: `Struk_WA_${Date.now()}.jpg`,
      };
    } else if (msgType === "audio") {
      const mediaId = message.audio?.id;
      if (!mediaId) {
        completeBotProcess(taskId, "failed", "ID media suara tidak ditemukan.");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mengunduh pesan suara.");
        return;
      }

      const media = await downloadWhatsAppMedia(mediaId);
      if (!media) {
        completeBotProcess(taskId, "failed", "Gagal mengunduh file audio dari WhatsApp.");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mengunduh file audio.");
        return;
      }

      mediaInput = {
        type: "audio",
        mimeType: media.mimeType || "audio/ogg",
        buffer: media.buffer,
      };
    }

    // 8. Execute Multimodal Ingestion Pipeline
    const result = await ingestMultimodalInput({
      channel: "whatsapp",
      familyId,
      member,
      senderName,
      text: msgType === "image" ? (message.image?.caption || "") : (text || ""),
      media: mediaInput,
    });

    // 9. Dispatch WhatsApp Responses
    if (result.status === "transaction_recorded") {
      const { transaction: newTx, categoryName, walletName, parsed, driveViewUrl, usedFastPath } = result;

      let itemSummary = "";
      if (parsed.items && parsed.items.length > 0) {
        itemSummary = `\n📋 *Rincian Item (${parsed.items.length} item):*\n`;
        parsed.items.slice(0, 5).forEach((item: any) => {
          itemSummary += ` • ${item.qty}x ${item.name} (${formatRupiah(item.price)})\n`;
        });
        if (parsed.items.length > 5) {
          itemSummary += ` • ... dan ${parsed.items.length - 5} item lainnya\n`;
        }
      }

      const receiptArchiveNote = driveViewUrl ? `\n📁 Bukti struk berhasil diarsipkan ke Cloudflare R2.` : "";

      let replySuccess = "";
      let headerTitle = "Pencatatan Transaksi";

      if (msgType === "image") {
        headerTitle = "Pencatatan Struk Otomatis";
        replySuccess =
          `✅ *STRUK BERHASIL DICATAT!*\n\n` +
          `🏪 Toko: *${parsed.merchant_name || "Struk Belanja"}*\n` +
          `💰 Total: *${formatRupiah(parsed.amount)}*\n` +
          `🏷️ Kategori: *${categoryName}*\n` +
          `💳 Dompet: *${walletName}*\n` +
          itemSummary +
          receiptArchiveNote;
      } else if (msgType === "audio") {
        headerTitle = "Pencatatan Voice Note";
        replySuccess =
          `🎙️ *TRANSAKSI SUARA DICATAT!*\n\n` +
          (parsed.transcription ? `💬 Transkripsi: _"${parsed.transcription}"_\n\n` : "") +
          `📝 Keterangan: *${parsed.description}*\n` +
          `💰 Nominal: *${formatRupiah(parsed.amount)}*\n` +
          `🏷️ Kategori: *${categoryName}*\n` +
          `💳 Dompet: *${walletName}*`;
      } else {
        replySuccess =
          `✅ *TRANSAKSI BERHASIL DICATAT!*\n\n` +
          `📝 Keterangan: *${parsed.description}*\n` +
          `💰 Nominal: *${parsed.type === "income" ? "+" : "-"}${formatRupiah(parsed.amount)}*\n` +
          `🏷️ Kategori: *${categoryName}*\n` +
          `💳 Dompet: *${walletName}*`;
      }

      completeBotProcess(taskId, "success", undefined, {
        aiModel: usedFastPath
          ? "Fast-Path Regex (<0.8s)"
          : msgType === "image"
          ? "Gemini 3.5 Flash Lite OCR"
          : "Gemini 3.5 Flash Lite",
        transactionId: newTx.id,
        parsedMetadata: { ...parsed, usedFastPath },
      });

      recordChatLog({
        id: taskId,
        channel: "whatsapp",
        chat_id: senderPhone,
        sender_name: senderName,
        input_type: msgType,
        raw_prompt: text || (msgType === "image" ? "[Foto Struk]" : "[Pesan Suara]"),
        parsed_metadata: parsed,
        status: "success",
        created_at: new Date().toISOString(),
      });

      const buttons = [
        { id: `undo_${newTx.id}`, title: "❌ Batalkan" },
        { id: "action_summary", title: "📊 Ringkasan" },
        { id: "action_balance", title: "💳 Cek Saldo" },
      ];

      await sendWhatsAppInteractiveButtons(senderPhone, replySuccess, buttons, headerTitle);
      return;
    }

    if (result.status === "duplicate_skipped") {
      const dupLabel = result.parsed.description || result.parsed.merchant_name || text || "Transaksi";
      const dupMsg =
        `⚠️ *Transaksi Serupa Sudah Dicatat*\n\n` +
        `Transaksi *${dupLabel}* sebesar *${formatRupiah(result.parsed.amount)}* baru saja dicatat ${result.minutesAgo || 1} menit yang lalu.\n\n` +
        `_Sistem melewatinya secara otomatis untuk mencegah pencatatan data ganda._`;

      await sendWhatsAppTextMessage(senderPhone, dupMsg);
      completeBotProcess(taskId, "success", undefined, { parsedMetadata: { duplicateSkipped: true } });
      return;
    }

    if (result.status === "financial_qa_answered") {
      completeBotProcess(taskId, "success");
      recordChatLog({
        id: taskId,
        channel: "whatsapp",
        chat_id: senderPhone,
        sender_name: senderName,
        input_type: "text",
        raw_prompt: text,
        parsed_metadata: { answer: result.answer },
        status: "success",
        created_at: new Date().toISOString(),
      });

      await sendWhatsAppInteractiveButtons(
        senderPhone,
        `💡 *JAWABAN AI KEUANGAN:*\n\n${result.answer}`,
        DEFAULT_WHATSAPP_BUTTONS,
        "Konsultasi Keuangan"
      );
      return;
    }

    if (result.status === "unrecognized") {
      completeBotProcess(taskId, "failed", "Nominal transaksi tidak terdeteksi");
      await sendWhatsAppTextMessage(senderPhone, `⚠️ ${result.message}`);
      return;
    }

    // result.status === "error"
    completeBotProcess(taskId, "failed", result.error);
    await sendWhatsAppTextMessage(senderPhone, `❌ ${result.error}`);
    return;
  } catch (err: any) {
    console.error("[WhatsApp] Unhandled error:", err);
    completeBotProcess(taskId, "failed", err.message || "Internal server error");
    await sendWhatsAppTextMessage(
      senderPhone,
      "⚠️ Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba kembali."
    );
  }
}
