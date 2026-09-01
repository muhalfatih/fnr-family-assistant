import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";
import { mockStore } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear =
      searchParams.get("monthYear") ||
      searchParams.get("period") ||
      new Date().toISOString().substring(0, 7);

    if (!isSupabaseConfigured()) {
      const categories = mockStore.getCategories().filter((c) => c.type === "expense");
      const budgets = mockStore.getBudgets(monthYear);
      const allTxMonth = mockStore.getTransactions(monthYear);
      const txs = allTxMonth.filter((t) => t.type === "expense");

      let totalExpense = 0;
      let totalIncome = 0;
      allTxMonth.forEach((t) => {
        const amt = Number(t.amount || 0);
        if (t.type === "expense") totalExpense += amt;
        if (t.type === "income") totalIncome += amt;
      });

      const spentMap: Record<string, number> = {};
      txs.forEach((tx) => {
        if (tx.category_id) {
          spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + Number(tx.amount);
        }
      });

      const budgetItems = categories.map((cat) => {
        const b = budgets.find((item) => item.category_id === cat.id);
        return {
          id: b?.id || `cat-${cat.id}`,
          category_id: cat.id,
          name: cat.name,
          spent: spentMap[cat.id] || 0,
          target: b ? Number(b.target_amount) : 0,
          color: cat.color || "#3b82f6",
        };
      });

      return NextResponse.json({
        budgets: budgetItems,
        monthYear,
        monthlyTotalExpense: totalExpense,
        monthlyTotalIncome: totalIncome,
      });
    }

    const { startDate, endDate } = getMonthDateRange(monthYear);

    // 1. Fetch categories
    const { data: categories, error: catErr } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("type", "expense")
      .order("name", { ascending: true });

    if (catErr) {
      console.warn("Supabase categories error, falling back to mock:", catErr.message);
      const mockCats = mockStore.getCategories().filter((c) => c.type === "expense");
      const mockB = mockStore.getBudgets(monthYear);
      const budgetItems = mockCats.map((cat) => {
        const b = mockB.find((item) => item.category_id === cat.id);
        return {
          id: b?.id || `cat-${cat.id}`,
          category_id: cat.id,
          name: cat.name,
          spent: 0,
          target: b ? Number(b.target_amount) : 0,
          color: cat.color || "#3b82f6",
        };
      });
      return NextResponse.json({ budgets: budgetItems, monthYear });
    }

    // 2. Fetch budgets for the period
    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("month_year", monthYear);

    // 3. Fetch monthly expenses per category with safe date range
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("category_id, amount, type")
      .eq("type", "expense")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    const spentMap: Record<string, number> = {};
    if (transactions) {
      transactions.forEach((tx) => {
        if (tx.category_id) {
          spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + Number(tx.amount);
        }
      });
    }

    const budgetItems = (categories || []).map((cat) => {
      const b = budgets?.find((item) => item.category_id === cat.id);
      return {
        id: b?.id || `cat-${cat.id}`,
        category_id: cat.id,
        name: cat.name,
        spent: spentMap[cat.id] || 0,
        target: b ? Number(b.target_amount) : 0,
        color: cat.color || "#3b82f6",
      };
    });

    return NextResponse.json({ budgets: budgetItems, monthYear });
  } catch (err: any) {
    console.warn("Error in GET budgets, falling back to mock:", err.message);
    const mockCats = mockStore.getCategories().filter((c) => c.type === "expense");
    const budgetItems = mockCats.map((cat) => ({
      id: `cat-${cat.id}`,
      category_id: cat.id,
      name: cat.name,
      spent: 0,
      target: 0,
      color: cat.color || "#3b82f6",
    }));
    return NextResponse.json({ budgets: budgetItems, monthYear: "2026-09" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, budgets, monthYear = new Date().toISOString().substring(0, 7) } = body;
    const targetItems = items || (budgets ? budgets.map((b: any) => ({ category_id: b.categoryId, target: b.targetAmount })) : []);

    if (!Array.isArray(targetItems)) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      mockStore.setBudgets(monthYear, targetItems.map((item: any) => ({
        categoryId: item.category_id || item.categoryId,
        targetAmount: item.target !== undefined ? item.target : item.targetAmount,
      })));
      return NextResponse.json({ success: true, monthYear });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      mockStore.setBudgets(monthYear, targetItems.map((item: any) => ({
        categoryId: item.category_id || item.categoryId,
        targetAmount: item.target !== undefined ? item.target : item.targetAmount,
      })));
      return NextResponse.json({ success: true, monthYear });
    }

    for (const item of targetItems) {
      const catId = item.category_id || item.categoryId;
      const target = item.target !== undefined ? item.target : item.targetAmount;
      if (catId && target !== undefined) {
        await supabaseAdmin
          .from("budgets")
          .upsert(
            {
              family_id: familyId,
              category_id: catId,
              target_amount: target,
              period: "monthly",
              month_year: monthYear,
            },
            { onConflict: "family_id,category_id,month_year" }
          );
      }
    }

    return NextResponse.json({ success: true, monthYear });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
