import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";
import {
  parseFinancialInputWithGemini,
  answerFinancialQuestionWithGemini,
} from "@/lib/gemini/parser";
import { uploadReceiptToR2 } from "@/lib/storage/r2";
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
import { formatRupiah, formatDateIndo, getMonthDateRange } from "@/lib/utils";
import { whatsAppConfig, getReceiptAckMessage, getAudioAckMessage } from "@/lib/whatsapp/config";
import { fastParseIndonesianFinancialText } from "@/lib/bot/fast-parser";

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

// Helper to wrap external queries with a 2-second timeout to prevent webhook hanging
async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
    ),
  ]);
}

/**
 * Helper to fetch live financial data for a family with instant mock fallback
 */
async function getFamilyFinancialData(familyId: string) {
  if (!isSupabaseConfigured()) {
    const wallets = mockStore.getWallets();
    const categories = mockStore.getCategories();
    const budgets = mockStore.getBudgets();
    const transactions = mockStore.getTransactions();

    let monthlyTotalExpense = 0;
    let monthlyTotalIncome = 0;

    transactions.forEach((t) => {
      if (t.type === "expense") monthlyTotalExpense += Number(t.amount);
      if (t.type === "income") monthlyTotalIncome += Number(t.amount);
    });

    return {
      wallets,
      categories,
      budgets,
      monthTransactions: transactions,
      recentTransactions: transactions.slice(0, 5),
      monthlyTotalExpense,
      monthlyTotalIncome,
    };
  }

  const currentMonth = new Date().toISOString().substring(0, 7);
  const { startDate, endDate } = getMonthDateRange(currentMonth);

  try {
    const [walletsRes, categoriesRes, budgetsRes, monthTxRes, recentTxRes] = await Promise.all([
      withTimeout(supabaseAdmin.from("wallets").select("*").eq("family_id", familyId).eq("is_active", true), 2000).catch(() => ({ data: mockStore.getWallets() })),
      withTimeout(supabaseAdmin.from("categories").select("*").eq("family_id", familyId), 2000).catch(() => ({ data: mockStore.getCategories() })),
      withTimeout(supabaseAdmin.from("budgets").select("*, category:categories(*)").eq("family_id", familyId).eq("month_year", currentMonth), 2000).catch(() => ({ data: mockStore.getBudgets() })),
      withTimeout(supabaseAdmin.from("transactions").select("amount, type, category_id").eq("family_id", familyId).gte("transaction_date", startDate).lte("transaction_date", endDate), 2000).catch(() => ({ data: [] })),
      withTimeout(supabaseAdmin.from("transactions").select("*, category:categories(name, color), wallet:wallets(name)").eq("family_id", familyId).order("transaction_date", { ascending: false }).limit(5), 2000).catch(() => ({ data: [] })),
    ]);

    const wallets = walletsRes?.data || mockStore.getWallets();
    const categories = categoriesRes?.data || mockStore.getCategories();
    const budgets = budgetsRes?.data || mockStore.getBudgets();
    const monthTransactions = monthTxRes?.data || [];
    const recentTransactions = recentTxRes?.data || [];

    let monthlyTotalExpense = 0;
    let monthlyTotalIncome = 0;

    monthTransactions.forEach((t: any) => {
      if (t.type === "expense") monthlyTotalExpense += Number(t.amount);
      if (t.type === "income") monthlyTotalIncome += Number(t.amount);
    });

    return {
      wallets,
      categories,
      budgets,
      monthTransactions,
      recentTransactions,
      monthlyTotalExpense,
      monthlyTotalIncome,
    };
  } catch (e) {
    return {
      wallets: mockStore.getWallets(),
      categories: mockStore.getCategories(),
      budgets: mockStore.getBudgets(),
      monthTransactions: [],
      recentTransactions: [],
      monthlyTotalExpense: 0,
      monthlyTotalIncome: 0,
    };
  }
}

/**
 * Helper to resolve the appropriate wallet for a family with instant fallback
 */
async function resolveWallet(
  familyId: string,
  walletHint?: string | null,
  defaultWalletId?: string | null
) {
  if (!isSupabaseConfigured()) {
    const wallets = mockStore.getWallets();
    let chosen = wallets.find((w) => walletHint && w.name.toLowerCase().includes(walletHint.toLowerCase()));
    if (!chosen && defaultWalletId) chosen = wallets.find((w) => w.id === defaultWalletId);
    return chosen || wallets[0] || { id: "wal-cash", name: "Dompet Tunai" };
  }

  try {
    const { data: wallets } = await withTimeout<any>(
      supabaseAdmin.from("wallets").select("*").eq("family_id", familyId).eq("is_active", true),
      2000
    );

    let chosenWallet = wallets?.find((w: any) =>
      walletHint && w.name.toLowerCase().includes(walletHint.toLowerCase())
    );

    if (!chosenWallet && defaultWalletId) {
      chosenWallet = wallets?.find((w: any) => w.id === defaultWalletId);
    }

    if (!chosenWallet && wallets && wallets.length > 0) {
      chosenWallet = wallets[0];
    }

    return chosenWallet || mockStore.getWallets()[0];
  } catch (e) {
    return mockStore.getWallets()[0];
  }
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

  // 2. Resolve Family and Member with instant fallback
  let familyId = "fam-001";
  let defaultWalletId: string | null = null;
  let member: any = null;

  if (isSupabaseConfigured()) {
    try {
      const { data } = await withTimeout<any>(
        supabaseAdmin
          .from("family_members")
          .select("*, family:families(*)")
          .or(`whatsapp_number.eq.${normalizedPhone},whatsapp_number.eq.0${normalizedPhone.replace(/^62/, "")},whatsapp_number.eq.+${normalizedPhone}`)
          .maybeSingle(),
        2000
      );

      if (data) {
        member = data;
        familyId = data.family_id || "fam-001";
        defaultWalletId = data.default_wallet_id || null;
      } else {
        const { data: families } = await withTimeout<any>(
          supabaseAdmin.from("families").select("id").limit(1),
          2000
        );
        if (families && families.length > 0) {
          familyId = families[0].id;
        }
      }
    } catch (e) {
      familyId = mockStore.getFamily().id;
    }
  } else {
    const members = mockStore.getMembers();
    member = members.find((m: any) => m.whatsapp_number?.includes(normalizedPhone)) || members[0];
    familyId = mockStore.getFamily().id;
    defaultWalletId = member?.default_wallet_id || null;
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
      `   _Kirim foto nota supermarket/restoran, AI akan otomatis membaca rincian item, toko, total, dan mengunggahnya ke Google Drive._\n\n` +
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

      // Parse immediately with Gemini OCR without blocking on Google Drive
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
      let newTx: any = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error: txErr } = await withTimeout<any>(
            supabaseAdmin
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
                drive_file_id: null,
                drive_view_url: null,
                parsed_metadata: {
                  merchant: parsed.merchant_name,
                  items: parsed.items,
                  confidence: parsed.confidence,
                  source: "whatsapp",
                },
              })
              .select("*, category:categories(name), wallet:wallets(name)")
              .single(),
            2000
          );
          if (!txErr && data) newTx = data;
        } catch (e) {
          console.warn("[WhatsApp] Supabase image insert timeout, falling back to mockStore");
        }
      }

      if (!newTx) {
        newTx = mockStore.addTransaction({
          family_id: familyId,
          member_id: member?.id || null,
          wallet_id: chosenWallet.id,
          category_id: categoryId,
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description || (parsed.merchant_name ? `Struk: ${parsed.merchant_name}` : "Belanja Struk"),
          raw_prompt: caption || "Struk Foto WhatsApp",
          media_type: "image",
        });
        newTx.wallet = chosenWallet;
        newTx.category = { name: parsed.category };
      }

      // Background: Asynchronous non-blocking upload to Cloudflare R2
      if (whatsAppConfig.enableAsyncDriveUpload) {
        uploadReceiptToR2(
          media.buffer,
          `Struk_WA_${Date.now()}.jpg`,
          media.mimeType || "image/jpeg"
        )
          .then(async (r2Result) => {
            if (r2Result?.url && newTx?.id) {
              await supabaseAdmin
                .from("transactions")
                .update({
                  drive_view_url: r2Result.url,
                  drive_file_id: r2Result.fileId,
                })
                .eq("id", newTx.id);
            }
          })
          .catch((r2Err) => {
            console.error("[WhatsApp] Background R2 upload failed:", r2Err);
          });
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
        `\n📁 Bukti struk sedang diarsipkan ke Google Drive.`;

      completeBotProcess(taskId, "success", undefined, {
        aiModel: "Gemini 2.5 Flash OCR",
        transactionId: newTx.id,
        parsedMetadata: parsed,
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

      // 1. Fast-Path Regex Parsing (<0.8s) for common Indonesian transaction patterns
      let parsed: any = null;
      let usedFastPath = false;

      if (whatsAppConfig.enableFastPathRegex) {
        const fastResult = fastParseIndonesianFinancialText(text);
        if (fastResult && fastResult.amount > 0 && fastResult.confidence >= 0.85) {
          parsed = {
            confidence: fastResult.confidence,
            type: fastResult.type,
            amount: fastResult.amount,
            category: fastResult.category,
            wallet_hint: fastResult.wallet_hint,
            description: fastResult.description,
            items: [],
          };
          usedFastPath = true;
        }
      }

      // 2. Fallback to Gemini AI if not parsed via Fast-Path
      if (!parsed) {
        parsed = await parseFinancialInputWithGemini({ text });
      }

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
      let newTx: any = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error: txErr } = await withTimeout<any>(
            supabaseAdmin
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
                  engine: usedFastPath ? "fast_path_regex" : "gemini_ai",
                },
              })
              .select("*, category:categories(name), wallet:wallets(name)")
              .single(),
            2000
          );
          if (!txErr && data) newTx = data;
        } catch (e) {
          console.warn("[WhatsApp] Supabase text insert timeout, falling back to mockStore");
        }
      }

      if (!newTx) {
        newTx = mockStore.addTransaction({
          family_id: familyId,
          member_id: member?.id || null,
          wallet_id: chosenWallet.id,
          category_id: categoryId,
          type: parsed.type,
          amount: parsed.amount,
          description: parsed.description,
          raw_prompt: text,
          media_type: "text",
        });
        newTx.wallet = chosenWallet;
        newTx.category = { name: parsed.category };
      }

      appendTransactionToSheet(newTx).catch(() => {});

      const replyTxSuccess =
        `✅ *TRANSAKSI BERHASIL DICATAT!*\n\n` +
        `📝 Keterangan: *${parsed.description}*\n` +
        `💰 Nominal: *${parsed.type === "income" ? "+" : "-"}${formatRupiah(parsed.amount)}*\n` +
        `🏷️ Kategori: *${newTx.category?.name || parsed.category}*\n` +
        `💳 Dompet: *${newTx.wallet?.name || "Dompet Utama"}*`;

      completeBotProcess(taskId, "success", undefined, {
        aiModel: usedFastPath ? "Fast-Path Regex (<0.8s)" : "Gemini 2.5 Flash",
        transactionId: newTx.id,
        parsedMetadata: {
          ...parsed,
          usedFastPath,
        },
      });
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
