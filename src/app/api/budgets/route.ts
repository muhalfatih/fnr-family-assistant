import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("period") || new Date().toISOString().substring(0, 7);
    const { startDate, endDate } = getMonthDateRange(monthYear);

    // 1. Fetch categories
    const { data: categories, error: catErr } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("type", "expense")
      .order("name", { ascending: true });

    if (catErr) {
      return NextResponse.json({ error: catErr.message }, { status: 500 });
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
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, monthYear = new Date().toISOString().substring(0, 7) } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid items array" }, { status: 400 });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ error: "Family not found" }, { status: 400 });
    }

    for (const item of items) {
      if (item.category_id && item.target !== undefined) {
        await supabaseAdmin
          .from("budgets")
          .upsert(
            {
              family_id: familyId,
              category_id: item.category_id,
              target_amount: item.target,
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
