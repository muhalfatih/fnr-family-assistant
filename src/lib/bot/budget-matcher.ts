import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";
import { getMonthDateRange } from "@/lib/utils";

export interface BudgetStatusResult {
  categoryId: string;
  categoryName: string;
  targetAmount: number;
  totalSpent: number;
  percent: number;
  statusIcon: string;
  isOverbudget: boolean;
}

// Semantic keywords map for intelligent categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Makanan & Minuman": [
    "makan", "minum", "restoran", "resto", "cafe", "kafe", "kopi", "coffee",
    "sarapan", "lunch", "dinner", "jajan", "snack", "gofood", "grabfood", "shopeefood",
    "bakso", "mie", "ayam", "sate", "nasi", "warung", "mcd", "kfc"
  ],
  "Belanja Bulanan / Groceries": [
    "belanja", "groceries", "supermarket", "minimarket", "indomaret", "alfamart",
    "hypermart", "superindo", "pasar", "sembako", "sabun", "shampoo", "minyak", "beras"
  ],
  "Transportasi & Bensin": [
    "transport", "bensin", "bbm", "pertalite", "pertamax", "solar", "shell", "spbu",
    "tol", "parkir", "ojol", "gojek", "grab", "maxim", "kereta", "krl", "mrt", "service", "bengkel"
  ],
  "Tagihan & Utilitas": [
    "tagihan", "utilitas", "listrik", "pln", "token", "pdam", "air", "wifi", "indihome",
    "biznet", "pulsa", "paket data", "kuota", "telkomsel", "indosat", "xl", "ipl"
  ],
  "Kesehatan & Obat": [
    "kesehatan", "obat", "apotek", "apotik", "dokter", "klinik", "rumah sakit", "rs",
    "vitamin", "laboratorium", "tes darah", "bpjs"
  ],
  "Pendidikan & Anak": [
    "pendidikan", "sekolah", "spp", "les", "kursus", "buku", "alat tulis", "mainan",
    "seragam", "uang jajan", "kuliah"
  ],
  "Hiburan & Rekreasi": [
    "hiburan", "rekreasi", "nonton", "bioskop", "cinema", "xxi", "netflix", "spotify",
    "youtube", "game", "steam", "liburan", "hotel", "wisata"
  ],
  "Donasi & Sosial": [
    "zakat", "infaq", "sedekah", "donasi", "sumbangan", "kondangan", "kado", "hadiah"
  ]
};

/**
 * Intelligently matches or creates a category, ensures a budget row exists for current month,
 * and computes real-time budget utilization.
 */
export async function matchCategoryAndSyncBudget(
  familyId: string,
  rawCategoryInput?: string | null,
  description?: string | null,
  amount: number = 0,
  type: "expense" | "income" | "transfer" = "expense"
): Promise<BudgetStatusResult | null> {
  const currentMonth = new Date().toISOString().substring(0, 7);

  // Fast-path mock fallback when database is not configured
  if (!isSupabaseConfigured()) {
    const categories = mockStore.getCategories();
    const inputLower = (rawCategoryInput || "").toLowerCase();
    const matched = categories.find((c) =>
      c.name.toLowerCase().includes(inputLower) || inputLower.includes(c.name.toLowerCase())
    ) || categories[0];

    return {
      categoryId: matched?.id || "cat-default",
      categoryName: matched?.name || rawCategoryInput || "Lain-lain",
      targetAmount: 2000000,
      totalSpent: amount,
      percent: Math.min(100, Math.round((amount / 2000000) * 100)),
      statusIcon: "🟢",
      isOverbudget: false,
    };
  }

  // 1. Fetch all existing categories for this family
  const { data: existingCategories } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("family_id", familyId)
    .eq("type", type === "income" ? "income" : "expense");

  let matchedCategory: any = null;
  const inputLower = (rawCategoryInput || "").toLowerCase();
  const descLower = (description || "").toLowerCase();

  // A. Check exact or substring match in existing categories
  if (existingCategories && existingCategories.length > 0) {
    matchedCategory = existingCategories.find((cat: any) => {
      const catName = cat.name.toLowerCase();
      return (
        catName === inputLower ||
        catName.includes(inputLower) ||
        inputLower.includes(catName)
      );
    });
  }

  // B. Check semantic keyword map against existing categories
  if (!matchedCategory && existingCategories && existingCategories.length > 0) {
    for (const [standardName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      const matchKeyword = keywords.some(
        (kw) => inputLower.includes(kw) || descLower.includes(kw)
      );
      if (matchKeyword) {
        matchedCategory = existingCategories.find((cat: any) =>
          cat.name.toLowerCase().includes(standardName.toLowerCase().split(" ")[0])
        );
        if (matchedCategory) break;
      }
    }
  }

  // C. If still not matched, find closest standard category name or create new
  if (!matchedCategory) {
    let targetName = rawCategoryInput || "Lain-lain";
    // Check if matches standard names
    for (const [standardName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (
        keywords.some((kw) => inputLower.includes(kw) || descLower.includes(kw)) ||
        standardName.toLowerCase().includes(inputLower)
      ) {
        targetName = standardName;
        break;
      }
    }

    const { data: newCat } = await supabaseAdmin
      .from("categories")
      .insert({
        family_id: familyId,
        name: targetName,
        type: type === "income" ? "income" : "expense",
        icon: "Tag",
        color: "#3b82f6",
      })
      .select()
      .single();

    matchedCategory = newCat;
  }

  if (!matchedCategory) {
    return null;
  }

  // 2. Ensure a budget entry exists for this category in current month
  let targetBudgetAmount = 0;
  if (type === "expense") {
    const { data: currentBudget } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("family_id", familyId)
      .eq("category_id", matchedCategory.id)
      .eq("month_year", currentMonth)
      .maybeSingle();

    if (currentBudget) {
      targetBudgetAmount = Number(currentBudget.target_amount || 0);
    } else {
      // Look for target from previous months to inherit
      const { data: prevBudget } = await supabaseAdmin
        .from("budgets")
        .select("target_amount")
        .eq("family_id", familyId)
        .eq("category_id", matchedCategory.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      targetBudgetAmount = prevBudget ? Number(prevBudget.target_amount) : 0;

      // Auto-insert budget row for this month
      await supabaseAdmin.from("budgets").insert({
        family_id: familyId,
        category_id: matchedCategory.id,
        target_amount: targetBudgetAmount,
        period: "monthly",
        month_year: currentMonth,
      });
    }

    // 3. Compute total spent for this category in current month
    const { startDate, endDate } = getMonthDateRange(currentMonth);
    const { data: monthlyTransactions } = await supabaseAdmin
      .from("transactions")
      .select("amount")
      .eq("family_id", familyId)
      .eq("category_id", matchedCategory.id)
      .eq("type", "expense")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    const totalSpent = (monthlyTransactions || []).reduce(
      (acc, tx) => acc + Number(tx.amount || 0),
      0
    );

    const percent = targetBudgetAmount > 0 ? Math.round((totalSpent / targetBudgetAmount) * 100) : 0;
    const isOverbudget = targetBudgetAmount > 0 && totalSpent > targetBudgetAmount;
    const statusIcon = isOverbudget ? "🔴 Overbudget!" : percent >= 80 ? "🟡 Peringatan (≥80%)" : "🟢 Aman";

    return {
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      targetAmount: targetBudgetAmount,
      totalSpent,
      percent,
      statusIcon,
      isOverbudget,
    };
  }

  return {
    categoryId: matchedCategory.id,
    categoryName: matchedCategory.name,
    targetAmount: 0,
    totalSpent: 0,
    percent: 0,
    statusIcon: "🟢",
    isOverbudget: false,
  };
}
