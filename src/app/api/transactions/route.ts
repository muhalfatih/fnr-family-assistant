import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { appendTransactionToSheet } from "@/lib/google/sheets";
import { deleteReceiptMedia } from "@/lib/storage/r2";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "all";

    let query = supabaseAdmin
      .from("transactions")
      .select("*, member:family_members(*), wallet:wallets!transactions_wallet_id_fkey(*), category:categories(*)")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (period !== "all") {
      const startDate = `${period}-01T00:00:00.000Z`;
      const [year, month] = period.split("-").map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;
      query = query.gte("transaction_date", startDate).lte("transaction_date", endDate);
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error("Supabase transactions query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ transactions: transactions || [] });
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

    if (!targetFamilyId) {
      const { data: newFam } = await supabaseAdmin
        .from("families")
        .insert({ name: "Keluarga F&R", currency: "IDR" })
        .select("id")
        .single();
      targetFamilyId = newFam?.id;
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
      console.error("Supabase insert transaction failed:", insertErr.message);
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
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

    // 1. Fetch transaction first to obtain media pointers
    const { data: targetTx } = await supabaseAdmin
      .from("transactions")
      .select("id, drive_file_id, drive_view_url, media_url")
      .eq("id", id)
      .maybeSingle();

    const { error } = await supabaseAdmin.from("transactions").delete().eq("id", id);
    if (error) {
      console.error("[Transactions DELETE] Supabase delete error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 2. Clean up media storage (R2 / Local / Google Drive) to save space
    if (targetTx && (targetTx.drive_file_id || targetTx.drive_view_url || targetTx.media_url)) {
      deleteReceiptMedia({
        fileId: targetTx.drive_file_id,
        viewUrl: targetTx.drive_view_url,
        mediaUrl: targetTx.media_url,
      }).catch((err) => console.warn("[Transactions DELETE] Storage cleanup notice:", err));
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
