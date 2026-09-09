import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import {
  parseFinancialInputWithGemini,
  answerFinancialQuestionWithGemini,
  GeminiParsedTransaction,
} from "@/lib/gemini/parser";
import { uploadReceiptToR2 } from "@/lib/storage/r2";
import { appendTransactionToSheet } from "@/lib/google/sheets";
import { matchCategoryAndSyncBudget, BudgetStatusResult } from "@/lib/bot/budget-matcher";
import { checkRecentDuplicateTransaction } from "@/lib/bot/idempotency";
import { fastParseIndonesianFinancialText } from "@/lib/bot/fast-parser";
import { formatRupiah, getMonthDateRange } from "@/lib/utils";

export interface IngestionMediaInput {
  type: "image" | "audio";
  mimeType: string;
  buffer: Buffer;
  fileName?: string;
}

export interface IngestionInput {
  channel: "telegram" | "whatsapp" | "web";
  familyId: string;
  member: {
    id?: string;
    full_name: string;
    default_wallet_id?: string | null;
  } | null;
  senderName: string;
  text?: string;
  media?: IngestionMediaInput | null;
  onProgress?: (step: string) => Promise<void>;
}

export type IngestionResult =
  | {
      status: "transaction_recorded";
      transaction: any;
      categoryName: string;
      walletName: string;
      budgetStatus: BudgetStatusResult | null;
      parsed: GeminiParsedTransaction;
      driveViewUrl?: string | null;
      driveFileId?: string | null;
      usedFastPath: boolean;
    }
  | {
      status: "duplicate_skipped";
      parsed: GeminiParsedTransaction;
      message: string;
      minutesAgo?: number;
    }
  | {
      status: "financial_qa_answered";
      answer: string;
    }
  | {
      status: "unrecognized";
      message: string;
    }
  | {
      status: "error";
      error: string;
    };

/**
 * Fetches live financial context for a family for QA reasoning or summary
 */
export async function getFamilyFinancialContext(familyId: string) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  try {
    const { startDate, endDate } = getMonthDateRange(currentMonth);

    const [walletsRes, categoriesRes, budgetsRes, recentTxRes, monthlyTxRes] = await Promise.all([
      supabaseAdmin.from("wallets").select("*").eq("family_id", familyId).eq("is_active", true),
      supabaseAdmin.from("categories").select("*").eq("family_id", familyId).eq("type", "expense"),
      supabaseAdmin.from("budgets").select("*").eq("family_id", familyId).eq("month_year", currentMonth),
      supabaseAdmin
        .from("transactions")
        .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
        .eq("family_id", familyId)
        .order("transaction_date", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("transactions")
        .select("category_id, amount, type")
        .eq("family_id", familyId)
        .gte("transaction_date", startDate)
        .lte("transaction_date", endDate),
    ]);

    const wallets = walletsRes?.data || [];
    const categories = categoriesRes?.data || [];
    const budgets = budgetsRes?.data || [];
    const transactions = recentTxRes?.data || [];
    const monthlyTx = monthlyTxRes?.data || [];

    let monthlyTotalExpense = 0;
    let monthlyTotalIncome = 0;
    const spentMap: Record<string, number> = {};

    monthlyTx.forEach((tx: any) => {
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

    const budgetItems = (categories || []).map((cat: any) => {
      const b = budgets?.find((item: any) => item.category_id === cat.id);
      const target = b ? Number(b.target_amount) : 0;
      const spent = spentMap[cat.id] || 0;
      return {
        id: b?.id || cat.id,
        category_id: cat.id,
        name: cat.name,
        category: { name: cat.name },
        spent,
        target,
        target_amount: target,
      };
    });

    return {
      wallets: wallets || [],
      categories: categories || [],
      budgets: budgetItems,
      monthTransactions: monthlyTx || [],
      recentTransactions: transactions || [],
      monthlyTotalExpense,
      monthlyTotalIncome,
    };
  } catch (err) {
    console.warn("[MultimodalIngestor] Error getting financial context:", err);
    return {
      wallets: [],
      categories: [],
      budgets: [],
      recentTransactions: [],
      monthlyTotalExpense: 0,
      monthlyTotalIncome: 0,
    };
  }
}

/**
 * Core Ingestion Engine: parses text/image/audio, reconciles items, matches budget,
 * checks duplicate guard, resolves wallet, inserts to DB, and replicates to Sheets.
 */
export async function ingestMultimodalInput(input: IngestionInput): Promise<IngestionResult> {
  const { channel, familyId, member, senderName, text, media, onProgress } = input;

  let parsed: GeminiParsedTransaction | null = null;
  let driveFileId: string | null = null;
  let driveViewUrl: string | null = null;
  let usedFastPath = false;
  let rawPrompt = text || "";

  // 1. Process Media Input (Image/PDF or Audio)
  if (media) {
    if (media.type === "image") {
      rawPrompt = text ? `${text} [Foto Struk]` : "[Foto Struk]";
      if (onProgress) await onProgress("Membaca rincian struk dengan Gemini AI...");

      const originalName = media.fileName || `struk_${Date.now()}.jpg`;

      // Parallel execution: Upload to R2 and parse with Gemini OCR simultaneously
      const [r2Result, parsedResult] = await Promise.all([
        uploadReceiptToR2(media.buffer, originalName, media.mimeType).catch((err) => {
          console.warn("[MultimodalIngestor] R2 upload error:", err);
          return null;
        }),
        parseFinancialInputWithGemini({
          imageBuffer: media.buffer,
          imageMimeType: media.mimeType,
          text: text || undefined,
        }).catch((err) => {
          console.error("[MultimodalIngestor] Gemini OCR error:", err);
          return null;
        }),
      ]);

      if (r2Result) {
        driveFileId = r2Result.fileId;
        driveViewUrl = r2Result.url;
      }
      parsed = parsedResult;
    } else if (media.type === "audio") {
      rawPrompt = "[Pesan Suara]";
      if (onProgress) await onProgress("Mendengarkan & menerjemahkan audio dengan Gemini AI...");

      parsed = await parseFinancialInputWithGemini({
        audioBuffer: media.buffer,
        audioMimeType: media.mimeType,
      }).catch((err) => {
        console.error("[MultimodalIngestor] Gemini Audio parsing error:", err);
        return null;
      });
    }
  }
  // 2. Process Text Input
  else if (text && text.trim()) {
    const trimmedText = text.trim();

    // Fast-path regex parser (<0.8s) for standard Indonesian formats
    const fastResult = fastParseIndonesianFinancialText(trimmedText);
    if (fastResult && fastResult.amount > 0 && fastResult.confidence >= 0.85) {
      usedFastPath = true;
      parsed = {
        confidence: fastResult.confidence,
        type: fastResult.type,
        amount: fastResult.amount,
        category: fastResult.category,
        wallet_hint: fastResult.wallet_hint,
        description: fastResult.description,
        items: [],
      };
    } else {
      if (onProgress) await onProgress("Menganalisis teks transaksi...");
      parsed = await parseFinancialInputWithGemini({ text: trimmedText }).catch((err) => {
        console.error("[MultimodalIngestor] Gemini Text parser error:", err);
        return null;
      });
    }
  }

  // 3. Handle Conversational Financial Q&A Fallback
  if (!parsed || !parsed.amount || parsed.amount <= 0) {
    if (text && text.trim()) {
      if (onProgress) await onProgress("Memeriksa data keuangan keluarga...");
      const finContext = await getFamilyFinancialContext(familyId);
      const answer = await answerFinancialQuestionWithGemini(text.trim(), finContext).catch((err) => {
        console.warn("[MultimodalIngestor] Gemini QA error:", err);
        return "";
      });

      if (answer && answer.trim()) {
        return {
          status: "financial_qa_answered",
          answer: answer.trim(),
        };
      }
    }

    return {
      status: "unrecognized",
      message:
        "Maaf, transaksi belum dapat dikenali. Silakan ketik nominal yang jelas (contoh: *Beli makan siang 35rb*) atau kirim foto struk.",
    };
  }

  // 4. Item Reconciliation (if receipt items exist)
  if (parsed.items && parsed.items.length > 0) {
    const sumItems = parsed.items.reduce((acc, item) => acc + (Number(item.price) || 0) * (Number(item.qty) || 1), 0);
    if (sumItems > 0 && Math.abs(parsed.amount - sumItems) > 0 && (parsed.amount % 10000 === 0 || parsed.amount % 50000 === 0)) {
      parsed.amount = sumItems;
    }
  }

  // 5. Intelligent Category Matching & Budget Calculation
  const budgetSync = await matchCategoryAndSyncBudget(
    familyId,
    parsed.category,
    parsed.description,
    parsed.amount,
    parsed.type
  );
  const categoryId = budgetSync?.categoryId || null;
  const categoryDisplayName = budgetSync?.categoryName || parsed.category || "Lain-lain";

  // 6. Semantic 5-Minute Duplicate Transaction Guard
  const dupCheck = await checkRecentDuplicateTransaction({
    familyId,
    amount: parsed.amount,
    type: parsed.type,
    merchant: parsed.merchant_name,
    description: parsed.description,
    windowMinutes: 5,
  });

  if (dupCheck.isDuplicate) {
    const dupLabel = parsed.description || rawPrompt || "Transaksi";
    return {
      status: "duplicate_skipped",
      parsed,
      minutesAgo: dupCheck.minutesAgo || 1,
      message: `Transaksi *${dupLabel}* sebesar *${formatRupiah(parsed.amount)}* baru saja dicatat ${
        dupCheck.minutesAgo || 1
      } menit yang lalu. Sistem melewatinya secara otomatis untuk mencegah pencatatan ganda.`,
    };
  }

  // 7. Wallet Resolution (Hint -> Member Default -> First Active -> Auto Cash Fallback)
  let chosenWallet: any = null;
  const { data: activeWallets } = await supabaseAdmin
    .from("wallets")
    .select("*")
    .eq("family_id", familyId)
    .eq("is_active", true);

  if (activeWallets && activeWallets.length > 0) {
    if (parsed.wallet_hint) {
      chosenWallet = activeWallets.find((w: any) =>
        w.name.toLowerCase().includes(parsed!.wallet_hint!.toLowerCase())
      );
    }
    if (!chosenWallet && member?.default_wallet_id) {
      chosenWallet = activeWallets.find((w: any) => w.id === member.default_wallet_id);
    }
    if (!chosenWallet) {
      chosenWallet = activeWallets[0];
    }
  }

  // Auto-create fallback cash wallet if family has zero wallets
  if (!chosenWallet) {
    const { data: newWallet } = await supabaseAdmin
      .from("wallets")
      .insert({
        family_id: familyId,
        name: "Dompet Tunai / Kas",
        type: "cash",
        current_balance: 0,
        currency: "IDR",
        is_active: true,
      })
      .select()
      .single();
    chosenWallet = newWallet || { id: null, name: "Dompet Tunai" };
  }

  // 8. Insert Transaction into Database
  let transaction: any = null;
  const txDate = parsed.transaction_date
    ? new Date(parsed.transaction_date).toISOString()
    : new Date().toISOString();

  const insertPayload = {
    family_id: familyId,
    member_id: member?.id || null,
    wallet_id: chosenWallet.id,
    category_id: categoryId,
    type: parsed.type,
    amount: parsed.amount,
    transaction_date: txDate,
    description: parsed.description || (parsed.merchant_name ? `Struk: ${parsed.merchant_name}` : "Transaksi Belanja"),
    raw_prompt: rawPrompt,
    media_type: media ? media.type : "text",
    media_url: driveViewUrl || null,
    drive_file_id: driveFileId || null,
    drive_view_url: driveViewUrl || null,
    parsed_metadata: {
      merchant: parsed.merchant_name,
      items: parsed.items,
      confidence: parsed.confidence,
      source: channel,
      engine: usedFastPath ? "fast_path_regex" : "gemini_ai",
      transcription: parsed.transcription,
    },
  };

  try {
    const { data: inserted, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert(insertPayload)
      .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
      .single();

    if (txError) throw txError;
    transaction = inserted;
  } catch (err: any) {
    console.error("[MultimodalIngestor] Insert transaction to database failed:", err);
    return {
      status: "error",
      error: err.message || "Gagal menyimpan transaksi ke database.",
    };
  }

  // 9. Replicate to Google Sheets
  appendTransactionToSheet({
    transactionDate: txDate.split("T")[0],
    type: parsed.type,
    category: categoryDisplayName,
    amount: parsed.amount,
    walletName: chosenWallet.name,
    description: parsed.description,
    memberName: member?.full_name || senderName,
    driveLink: driveViewUrl || undefined,
  }).catch((err) => console.error("[MultimodalIngestor] Sheets append error:", err));

  return {
    status: "transaction_recorded",
    transaction,
    categoryName: categoryDisplayName,
    walletName: chosenWallet.name,
    budgetStatus: budgetSync,
    parsed,
    driveViewUrl,
    driveFileId,
    usedFastPath,
  };
}
