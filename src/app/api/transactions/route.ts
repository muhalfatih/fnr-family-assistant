import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { appendTransactionToSheet } from "@/lib/google/sheets";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select("*, member:family_members(*), wallet:wallets(*), category:categories(*)")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      family_id,
      member_id,
      wallet_id,
      category_id,
      to_wallet_id,
      type,
      amount,
      description,
      transaction_date,
    } = body;

    if (!wallet_id || !type || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Resolve family_id if not supplied
    let targetFamilyId = family_id;
    if (!targetFamilyId) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      targetFamilyId = families && families.length > 0 ? families[0].id : null;
    }

    // 2. Insert transaction
    const { data: transaction, error: insertErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        family_id: targetFamilyId,
        member_id: member_id || null,
        wallet_id,
        category_id: category_id || null,
        to_wallet_id: to_wallet_id || null,
        type,
        amount,
        description,
        transaction_date: transaction_date || new Date().toISOString(),
        media_type: "text",
      })
      .select("*, member:family_members(*), wallet:wallets(*), category:categories(*)")
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // 3. Real-time Append to Google Sheets
    appendTransactionToSheet({
      transactionDate: transaction.transaction_date.split("T")[0],
      type: transaction.type,
      category: transaction.category?.name || "Lain-lain",
      amount: transaction.amount,
      walletName: transaction.wallet?.name || "Dompet",
      description: transaction.description || undefined,
      memberName: transaction.member?.full_name || "Web Dashboard",
    }).catch((err) => console.error("Async Google Sheets append error:", err));

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
