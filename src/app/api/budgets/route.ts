import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";

function deduplicateCategories<T extends { name: string; is_default?: boolean }>(cats: T[]): T[] {
  const map = new Map<string, T>();
  for (const c of cats) {
    const key = c.name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, c);
    } else if (c.is_default && !map.get(key)!.is_default) {
      map.set(key, c);
    }
  }
  return Array.from(map.values());
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear =
      searchParams.get("monthYear") ||
      searchParams.get("period") ||
      new Date().toISOString().substring(0, 7);

    const { startDate, endDate } = getMonthDateRange(monthYear);

    // 1. Fetch categories
    const { data: categories, error: catErr } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("type", "expense")
      .order("name", { ascending: true });

    if (catErr) {
      console.error("Supabase categories error:", catErr.message);
      return NextResponse.json({ error: catErr.message }, { status: 500 });
    }

    // 2. Fetch budgets for the period
    const { data: budgets } = await supabaseAdmin
      .from("budgets")
      .select("*")
      .eq("month_year", monthYear);

    // 3. Fetch monthly transactions for accurate total income & category expenses
    const { data: allTransactions } = await supabaseAdmin
      .from("transactions")
      .select("category_id, amount, type")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    let totalExpense = 0;
    let totalIncome = 0;
    const spentMap: Record<string, number> = {};

    if (allTransactions) {
      allTransactions.forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.type === "expense") {
          totalExpense += amt;
          if (tx.category_id) {
            spentMap[tx.category_id] = (spentMap[tx.category_id] || 0) + amt;
          }
        } else if (tx.type === "income") {
          totalIncome += amt;
        }
      });
    }

    const cleanCategories = deduplicateCategories(categories || []);
    const budgetItems = cleanCategories.map((cat) => {
      const b = budgets?.find((item) => item.category_id === cat.id);
      return {
        id: b?.id || `cat-${cat.id}`,
        category_id: cat.id,
        name: cat.name,
        spent: spentMap[cat.id] || 0,
        target: b ? Number(b.target_amount) : 0,
        color: cat.color || "#3b82f6",
        is_default: Boolean(cat.is_default),
      };
    });

    return NextResponse.json({
      budgets: budgetItems,
      monthYear,
      monthlyTotalExpense: totalExpense,
      monthlyTotalIncome: totalIncome,
    });
  } catch (err: any) {
    console.error("Error in GET budgets:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, budgets, monthYear = new Date().toISOString().substring(0, 7) } = body;
    const targetItems =
      items ||
      (budgets
        ? budgets.map((b: any) => ({
            category_id: b.categoryId || b.category_id,
            target: b.targetAmount !== undefined ? b.targetAmount : b.target,
          }))
        : []);

    if (!Array.isArray(targetItems)) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    let familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      const { data: newFam } = await supabaseAdmin
        .from("families")
        .insert({ name: "Keluarga F&R", currency: "IDR" })
        .select("id")
        .single();
      familyId = newFam?.id;
    }

    if (!familyId) {
      return NextResponse.json({ error: "Keluarga tidak ditemukan." }, { status: 400 });
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
