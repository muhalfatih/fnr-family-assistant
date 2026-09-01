import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("period") || new Date().toISOString().substring(0, 7);
    const { startDate, endDate } = getMonthDateRange(monthYear);

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ contributions: [], totalExpense: 0 });
    }

    // 1. Fetch all members
    const { data: members } = await supabaseAdmin
      .from("family_members")
      .select("id, full_name, role, avatar_url")
      .eq("family_id", familyId);

    // 2. Fetch monthly transactions with category
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("id, member_id, amount, type, category:categories(id, name)")
      .eq("family_id", familyId)
      .eq("type", "expense")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    let totalExpense = 0;
    const memberMap: Record<
      string,
      {
        id: string;
        name: string;
        role: string;
        spent: number;
        count: number;
        categoryMap: Record<string, number>;
      }
    > = {};

    (members || []).forEach((m: any) => {
      memberMap[m.id] = {
        id: m.id,
        name: m.full_name,
        role: m.role,
        spent: 0,
        count: 0,
        categoryMap: {},
      };
    });

    // Also track unassigned
    let unassignedSpent = 0;
    let unassignedCount = 0;

    (transactions || []).forEach((tx: any) => {
      const amt = Number(tx.amount || 0);
      totalExpense += amt;

      if (tx.member_id && memberMap[tx.member_id]) {
        memberMap[tx.member_id].spent += amt;
        memberMap[tx.member_id].count += 1;

        const catName = tx.category?.name || "Lain-lain";
        memberMap[tx.member_id].categoryMap[catName] =
          (memberMap[tx.member_id].categoryMap[catName] || 0) + amt;
      } else {
        unassignedSpent += amt;
        unassignedCount += 1;
      }
    });

    const contributions = Object.values(memberMap).map((m) => {
      // Find top category
      let topCategory = "-";
      let topCategoryAmount = 0;
      for (const [cat, amt] of Object.entries(m.categoryMap)) {
        if (amt > topCategoryAmount) {
          topCategoryAmount = amt;
          topCategory = cat;
        }
      }

      const percent = totalExpense > 0 ? Math.round((m.spent / totalExpense) * 100) : 0;

      return {
        memberId: m.id,
        name: m.name,
        role: m.role,
        spent: m.spent,
        percentage: percent,
        transactionCount: m.count,
        topCategory: m.spent > 0 ? topCategory : "Belum ada transaksi",
      };
    });

    return NextResponse.json({
      contributions,
      totalExpense,
      unassigned: {
        spent: unassignedSpent,
        count: unassignedCount,
        percentage: totalExpense > 0 ? Math.round((unassignedSpent / totalExpense) * 100) : 0,
      },
      monthYear,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
