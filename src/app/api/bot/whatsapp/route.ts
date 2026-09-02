import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  parseFinancialInputWithGemini,
  answerFinancialQuestionWithGemini,
} from "@/lib/gemini/parser";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { appendTransactionToSheet } from "@/lib/google/sheets";
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
import { matchCategoryAndSyncBudget } from "@/lib/bot/budget-matcher";
import { checkMessageRelevance, checkRateLimit, getPoliteRejectionMessage } from "@/lib/bot/relevance-guard";
import { formatRupiah, getMonthDateRange } from "@/lib/utils";

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

/**
 * Helper to fetch live financial data for a family
 */
async function getFamilyFinancialData(familyId: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const { startDate, endDate } = getMonthDateRange(currentMonth);

  const { data: wallets } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true);

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("family_id", familyId);

  const { data: budgets } = await supabaseAdmin
    .from("budgets")
    .select("*, category:categories(*)")
    .eq("family_id", familyId)
    .eq("month_year", currentMonth);

  const { data: monthTransactions } = await supabaseAdmin
    .from("transactions")
    .select("amount, type, category_id")
    .eq("family_id", familyId)
    .gte("transaction_date", startDate)
    .lte("transaction_date", endDate);

  const { data: recentTransactions } = await supabaseAdmin
    .from("transactions")
    .select("*, category:categories(name, color), wallet:wallets(name)")
    .eq("family_id", familyId)
    .order("transaction_date", { ascending: false })
    .limit(5);

  let monthlyTotalExpense = 0;
  let monthlyTotalIncome = 0;

  (monthTransactions || []).forEach((t) => {
    if (t.type === "expense") monthlyTotalExpense += Number(t.amount);
    if (t.type === "income") monthlyTotalIncome += Number(t.amount);
  });

  return {
    wallets: wallets || [],
    categories: categories || [],
    budgets: budgets || [],
    monthTransactions: monthTransactions || [],
    recentTransactions: recentTransactions || [],
    monthlyTotalExpense,
    monthlyTotalIncome,
  };
}

/**
 * Helper to resolve the appropriate wallet for a family
 */
async function resolveWallet(
  familyId: string,
  walletHint?: string | null,
  defaultWalletId?: string | null
) {
  const { data: wallets } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true);

  let chosenWallet = wallets?.find((w: any) =>
    walletHint && w.name.toLowerCase().includes(walletHint.toLowerCase())
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

  return chosenWallet;
}

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

      // Mark message as read
      if (messageId) {
        markWhatsAppMessageAsRead(messageId).catch(() => {});
      }

      // Process asynchronously in background
      processWhatsAppMessage(senderPhone, senderName, message, messageId).catch((err) => {
        console.error("[WhatsApp] Error processing message:", err);
      });
    }
  }

  return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
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

  // 2. Resolve Family and Member from Supabase
  const { data: member } = await supabaseAdmin
    .from("family_members")
    .select("*, family:families(*)")
    .or(`whatsapp_number.eq.${normalizedPhone},whatsapp_number.eq.0${normalizedPhone.replace(/^62/, "")},whatsapp_number.eq.+${normalizedPhone}`)
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
    await sendWhatsAppTextMessage(senderPhone, "⚠️ Profil keluarga belum terdaftar di F&R Family Hub.");
    return;
  }

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

  // 4. Handle Quick Actions / Menu Commands
  const lowerText = text.toLowerCase();

  // 4a. Summary Action
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
    return;
  }

  // 4b. Balance Action
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
    return;
  }

  // 4c. Budget Action
  if (actionId === "action_budget" || lowerText.includes("anggaran") || lowerText === "budget") {
    const data = await getFamilyFinancialData(familyId);
    let budgetText = "";

    data.budgets.forEach((b) => {
      const catName = b.category?.name || "Kategori";
      const spent = data.monthTransactions
        .filter((t) => t.category_id === b.category_id && t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const target = Number(b.target_amount);
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
    return;
  }

  // 4d. Help Action
  if (actionId === "action_help" || lowerText === "bantuan" || lowerText === "help" || lowerText === "halo" || lowerText === "hi") {
    const helpMsg =
      `👋 *Halo, ${senderName}! Selamat Datang di F&R Family Hub WhatsApp*\n\n` +
      `Saya asisten keuangan keluarga berbasis AI. Anda dapat langsung mengirimkan:\n\n` +
      `1️⃣ *Pesan Teks Transaksi*\n` +
      `   _Contoh: 'Beli beras 120rb pake BCA'_\n` +
      `   _Contoh: 'Bensin motor 35k tunai'_\n\n` +
      `2️⃣ *Foto Struk Belanja*\n` +
      `   _Kirim foto nota supermarket/restoran, AI akan otomatis membaca rincian item, toko, total, dan mengunggahnya ke Google Drive._\n\n` +
      `3️⃣ *Pesan Suara (Voice Note)*\n` +
      `   _Rekam dan kirim suara Anda saat belanja._\n\n` +
      `4️⃣ *Tanya AI Keuangan*\n` +
      `   _Contoh: 'Berapa total belanja saya minggu ini?'_`;

    await sendWhatsAppInteractiveButtons(
      senderPhone,
      helpMsg,
      DEFAULT_WHATSAPP_BUTTONS,
      "Panduan Penggunaan"
    );
    return;
  }

  // 5. Register Bot Process Safeguard (15s Timeout)
  const taskId = `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputType = msgType === "image" ? "image" : msgType === "audio" ? "audio" : "text";

  registerBotProcess(
    taskId,
    {
      channel: "whatsapp",
      chatId: senderPhone,
      senderName,
      inputType,
      rawPrompt: text || `[Media ${msgType}]`,
    },
    {
      timeoutMs: 15000,
      onTimeout: async () => {
        await sendWhatsAppTextMessage(
          senderPhone,
          "⏳ Permintaan sedang membutuhkan waktu lebih lama. Sistem tetap memproses pencatatan transaksi Anda di latar belakang."
        );
      },
    }
  );

  try {
    // 6. Handle Image (Receipt / Struk OCR)
    if (msgType === "image") {
      const mediaId = message.image?.id;
      const caption = message.image?.caption || "";

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

      // Upload to Google Drive
      let driveResult: { fileId: string; webViewLink: string } | null = null;
      try {
        driveResult = await uploadReceiptToDrive(
          media.buffer,
          `Struk_WA_${Date.now()}.jpg`,
          media.mimeType || "image/jpeg"
        );
      } catch (driveErr) {
        console.error("[WhatsApp] Drive upload failed (continuing without drive link):", driveErr);
      }

      // Parse with Gemini OCR
      const parsed = await parseFinancialInputWithGemini({
        imageBuffer: media.buffer,
        imageMimeType: media.mimeType || "image/jpeg",
        text: caption || undefined,
      });

      if (!parsed || parsed.amount <= 0) {
        completeBotProcess(taskId, "failed", "Gemini OCR tidak menemukan nominal transaksi valid.");
        await sendWhatsAppTextMessage(
          senderPhone,
          "⚠️ AI tidak dapat mendeteksi nominal transaksi yang jelas pada foto struk tersebut. Pastikan foto terang dan terbaca jelas."
        );
        return;
      }

      // Resolve Wallet
      const chosenWallet = await resolveWallet(familyId, parsed.wallet_hint, defaultWalletId);

      // Resolve Category & Budget
      const budgetSync = await matchCategoryAndSyncBudget(
        familyId,
        parsed.category,
        parsed.description,
        parsed.amount,
        parsed.type
      );
      const categoryId = budgetSync?.categoryId || null;

      // Insert Transaction
      const { data: newTx, error: txErr } = await supabaseAdmin
        .from("transactions")
        .insert({
          family_id: familyId,
          member_id: member?.id || null,
          wallet_id: chosenWallet.id,
          category_id: categoryId,
          type: parsed.type,
          amount: parsed.amount,
          transaction_date: parsed.transaction_date ? new Date(parsed.transaction_date).toISOString() : new Date().toISOString(),
          description: parsed.description || (parsed.merchant_name ? `Struk: ${parsed.merchant_name}` : "Belanja Struk"),
          raw_prompt: caption || "Struk Foto WhatsApp",
          media_type: "image",
          drive_file_id: driveResult?.fileId || null,
          drive_view_url: driveResult?.webViewLink || null,
          parsed_metadata: {
            merchant: parsed.merchant_name,
            items: parsed.items,
            confidence: parsed.confidence,
            source: "whatsapp",
          },
        })
        .select("*, category:categories(name), wallet:wallets(name)")
        .single();

      if (txErr || !newTx) {
        completeBotProcess(taskId, "failed", txErr?.message || "Gagal menyimpan transaksi");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal menyimpan data transaksi ke database.");
        return;
      }

      // Sync to Google Sheets
      appendTransactionToSheet(newTx).catch(() => {});

      // Build Success Message
      let itemSummary = "";
      if (parsed.items && parsed.items.length > 0) {
        itemSummary = `\n📋 *Rincian Item (${parsed.items.length} item):*\n`;
        parsed.items.slice(0, 5).forEach((item) => {
          itemSummary += ` • ${item.qty}x ${item.name} (${formatRupiah(item.price)})\n`;
        });
        if (parsed.items.length > 5) {
          itemSummary += ` • ... dan ${parsed.items.length - 5} item lainnya\n`;
        }
      }

      const replySuccess =
        `✅ *STRUK BERHASIL DICATAT!*\n\n` +
        `🏪 Toko: *${parsed.merchant_name || "Struk Belanja"}*\n` +
        `💰 Total: *${formatRupiah(parsed.amount)}*\n` +
        `🏷️ Kategori: *${newTx.category?.name || parsed.category}*\n` +
        `💳 Dompet: *${newTx.wallet?.name || "Dompet Utama"}*\n` +
        itemSummary +
        (driveResult?.webViewLink ? `\n📁 Bukti struk tersimpan di Google Drive.` : "");

      completeBotProcess(taskId, "success");
      recordChatLog({
        id: taskId,
        channel: "whatsapp",
        chat_id: senderPhone,
        sender_name: senderName,
        input_type: "image",
        raw_prompt: caption || "[Foto Struk]",
        parsed_metadata: parsed,
        status: "success",
        created_at: new Date().toISOString(),
      });

      await sendWhatsAppInteractiveButtons(
        senderPhone,
        replySuccess,
        DEFAULT_WHATSAPP_BUTTONS,
        "Pencatatan Struk Otomatis"
      );
      return;
    }

    // 7. Handle Audio (Voice Note)
    if (msgType === "audio") {
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

      const parsed = await parseFinancialInputWithGemini({
        audioBuffer: media.buffer,
        audioMimeType: media.mimeType || "audio/ogg",
      });

      if (!parsed || parsed.amount <= 0) {
        completeBotProcess(taskId, "failed", "Gagal mengekstrak transaksi dari audio.");
        await sendWhatsAppTextMessage(
          senderPhone,
          "⚠️ Suara Anda telah diterima, namun AI tidak menemukan nominal transaksi keuangan yang jelas."
        );
        return;
      }

      const chosenWallet = await resolveWallet(familyId, parsed.wallet_hint, defaultWalletId);

      const budgetSync = await matchCategoryAndSyncBudget(
        familyId,
        parsed.category,
        parsed.description,
        parsed.amount,
        parsed.type
      );
      const categoryId = budgetSync?.categoryId || null;

      const { data: newTx, error: txErr } = await supabaseAdmin
        .from("transactions")
        .insert({
          family_id: familyId,
          member_id: member?.id || null,
          wallet_id: chosenWallet.id,
          category_id: categoryId,
          type: parsed.type,
          amount: parsed.amount,
          transaction_date: new Date().toISOString(),
          description: parsed.description,
          raw_prompt: parsed.transcription || "Pesan Suara WhatsApp",
          media_type: "audio",
          parsed_metadata: {
            transcription: parsed.transcription,
            confidence: parsed.confidence,
            source: "whatsapp",
          },
        })
        .select("*, category:categories(name), wallet:wallets(name)")
        .single();

      if (txErr || !newTx) {
        completeBotProcess(taskId, "failed", txErr?.message || "Gagal menyimpan transaksi");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mencatat transaksi suara.");
        return;
      }

      appendTransactionToSheet(newTx).catch(() => {});

      const replyVoiceSuccess =
        `🎙️ *TRANSAKSI SUARA DICATAT!*\n\n` +
        (parsed.transcription ? `💬 Transkripsi: _"${parsed.transcription}"_\n\n` : "") +
        `📝 Keterangan: *${parsed.description}*\n` +
        `💰 Nominal: *${formatRupiah(parsed.amount)}*\n` +
        `🏷️ Kategori: *${newTx.category?.name || parsed.category}*\n` +
        `💳 Dompet: *${newTx.wallet?.name || "Dompet Utama"}*`;

      completeBotProcess(taskId, "success");
      recordChatLog({
        id: taskId,
        channel: "whatsapp",
        chat_id: senderPhone,
        sender_name: senderName,
        input_type: "audio",
        raw_prompt: parsed.transcription || "[Pesan Suara]",
        parsed_metadata: parsed,
        status: "success",
        created_at: new Date().toISOString(),
      });

      await sendWhatsAppInteractiveButtons(
        senderPhone,
        replyVoiceSuccess,
        DEFAULT_WHATSAPP_BUTTONS,
        "Pencatatan Voice Note"
      );
      return;
    }

    // 8. Handle Text (Transaction Input or AI Question)
    if (msgType === "text" && text) {
      // Check relevance
      const relevance = checkMessageRelevance(text, senderName);
      if (!relevance.isRelevant) {
        const rejectionMsg = getPoliteRejectionMessage(senderName);
        completeBotProcess(taskId, "failed", "Pesan di luar cakupan finansial");
        await sendWhatsAppTextMessage(senderPhone, rejectionMsg);
        return;
      }

      // Check if user is asking a financial question
      const isQuestion =
        lowerText.startsWith("tanya") ||
        lowerText.startsWith("apakah") ||
        lowerText.startsWith("bagaimana") ||
        lowerText.startsWith("berapa") ||
        lowerText.startsWith("rekomendasi") ||
        lowerText.includes("?");

      if (isQuestion) {
        const financialContext = await getFamilyFinancialData(familyId);
        const aiAnswer = await answerFinancialQuestionWithGemini(text, financialContext);

        completeBotProcess(taskId, "success");
        recordChatLog({
          id: taskId,
          channel: "whatsapp",
          chat_id: senderPhone,
          sender_name: senderName,
          input_type: "text",
          raw_prompt: text,
          parsed_metadata: { answer: aiAnswer },
          status: "success",
          created_at: new Date().toISOString(),
        });

        await sendWhatsAppInteractiveButtons(
          senderPhone,
          `💡 *JAWABAN AI KEUANGAN:*\n\n${aiAnswer}`,
          DEFAULT_WHATSAPP_BUTTONS,
          "Konsultasi Keuangan"
        );
        return;
      }

      // Parse as Financial Transaction
      const parsed = await parseFinancialInputWithGemini({ text });

      if (!parsed || parsed.amount <= 0) {
        // If not parsed as clear transaction, answer intelligently with Gemini
        const financialContext = await getFamilyFinancialData(familyId);
        const aiFallback = await answerFinancialQuestionWithGemini(text, financialContext);

        completeBotProcess(taskId, "success");
        await sendWhatsAppTextMessage(senderPhone, `💡 ${aiFallback}`);
        return;
      }

      // Resolve Wallet
      const chosenWallet = await resolveWallet(familyId, parsed.wallet_hint, defaultWalletId);

      // Resolve Category & Budget
      const budgetSync = await matchCategoryAndSyncBudget(
        familyId,
        parsed.category,
        parsed.description,
        parsed.amount,
        parsed.type
      );
      const categoryId = budgetSync?.categoryId || null;

      // Insert Transaction
      const { data: newTx, error: txErr } = await supabaseAdmin
        .from("transactions")
        .insert({
          family_id: familyId,
          member_id: member?.id || null,
          wallet_id: chosenWallet.id,
          category_id: categoryId,
          type: parsed.type,
          amount: parsed.amount,
          transaction_date: new Date().toISOString(),
          description: parsed.description,
          raw_prompt: text,
          media_type: "text",
          parsed_metadata: {
            items: parsed.items,
            confidence: parsed.confidence,
            source: "whatsapp",
          },
        })
        .select("*, category:categories(name), wallet:wallets(name)")
        .single();

      if (txErr || !newTx) {
        completeBotProcess(taskId, "failed", txErr?.message || "Gagal menyimpan transaksi");
        await sendWhatsAppTextMessage(senderPhone, "⚠️ Gagal mencatat transaksi ke sistem.");
        return;
      }

      appendTransactionToSheet(newTx).catch(() => {});

      const replyTxSuccess =
        `✅ *TRANSAKSI BERHASIL DICATAT!*\n\n` +
        `📝 Keterangan: *${parsed.description}*\n` +
        `💰 Nominal: *${parsed.type === "income" ? "+" : "-"}${formatRupiah(parsed.amount)}*\n` +
        `🏷️ Kategori: *${newTx.category?.name || parsed.category}*\n` +
        `💳 Dompet: *${newTx.wallet?.name || "Dompet Utama"}*`;

      completeBotProcess(taskId, "success");
      recordChatLog({
        id: taskId,
        channel: "whatsapp",
        chat_id: senderPhone,
        sender_name: senderName,
        input_type: "text",
        raw_prompt: text,
        parsed_metadata: parsed,
        status: "success",
        created_at: new Date().toISOString(),
      });

      await sendWhatsAppInteractiveButtons(
        senderPhone,
        replyTxSuccess,
        DEFAULT_WHATSAPP_BUTTONS,
        "Pencatatan Transaksi"
      );
      return;
    }
  } catch (err: any) {
    console.error("[WhatsApp] Unhandled error:", err);
    completeBotProcess(taskId, "failed", err.message || "Internal server error");
    await sendWhatsAppTextMessage(
      senderPhone,
      "⚠️ Maaf, terjadi kendala saat memproses permintaan Anda. Silakan coba kembali."
    );
  }
}
