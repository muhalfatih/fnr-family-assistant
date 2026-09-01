import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { appendTransactionToSheet } from "@/lib/google/sheets";
import { mockStore } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ transactions: mockStore.getTransactions(period) });
    }

    const { data: transactions, error } = await supabaseAdmin
      .from("transactions")
      .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase transactions query error, falling back to mock:", error.message);
      return NextResponse.json({ transactions: mockStore.getTransactions(period) });
    }

    return NextResponse.json({ transactions: transactions || [] });
  } catch (err: any) {
    console.warn("Error in GET transactions, falling back to mock:", err.message);
    return NextResponse.json({ transactions: mockStore.getTransactions() });
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

    if (!isSupabaseConfigured()) {
      const newTx = mockStore.addTransaction({
        member_id,
        wallet_id,
        category_id,
        to_wallet_id,
        type,
        amount,
        description,
        transaction_date: transaction_date || new Date().toISOString(),
      });
      return NextResponse.json({ transaction: newTx }, { status: 201 });
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
      .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
      .single();

    if (insertErr) {
      console.warn("Supabase insert transaction failed, falling back to mock store:", insertErr.message);
      const newTx = mockStore.addTransaction({
        member_id,
        wallet_id,
        category_id,
        to_wallet_id,
        type,
        amount,
        description,
        transaction_date: transaction_date || new Date().toISOString(),
      });
      return NextResponse.json({ transaction: newTx }, { status: 201 });
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

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      mockStore.deleteTransaction(id);
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin.from("transactions").delete().eq("id", id);
    if (error) {
      mockStore.deleteTransaction(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
