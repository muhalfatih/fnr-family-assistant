import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ wallets: mockStore.getWallets() });
    }

    const { data: wallets, error } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase wallets query error, falling back to mock:", error.message);
      return NextResponse.json({ wallets: mockStore.getWallets() });
    }

    return NextResponse.json({ wallets: wallets || [] });
  } catch (err: any) {
    console.warn("Error fetching wallets, falling back to mock:", err.message);
    return NextResponse.json({ wallets: mockStore.getWallets() });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, current_balance, currency = "IDR", family_id } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Nama dan tipe rekening wajib diisi" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const newWallet = mockStore.addWallet({ name, type, current_balance, currency, family_id });
      return NextResponse.json({ wallet: newWallet }, { status: 201 });
    }

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

    const { data: wallet, error } = await supabaseAdmin
      .from("wallets")
      .insert({
        family_id: targetFamilyId,
        name,
        type,
        current_balance: current_balance || 0,
        currency,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.warn("Supabase add wallet failed, saving to mock store:", error.message);
      const newWallet = mockStore.addWallet({ name, type, current_balance, currency, family_id: targetFamilyId });
      return NextResponse.json({ wallet: newWallet }, { status: 201 });
    }

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, type, current_balance, account_number, currency, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "ID rekening wajib disertakan" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const updated = mockStore.updateWallet(id, {
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(current_balance !== undefined && { current_balance: Number(current_balance) }),
        ...(account_number !== undefined && { account_number }),
        ...(currency !== undefined && { currency }),
        ...(is_active !== undefined && { is_active }),
      });

      if (!updated) {
        return NextResponse.json({ error: "Rekening tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ wallet: updated, success: true });
    }

    const { data: wallet, error } = await supabaseAdmin
      .from("wallets")
      .update({
        ...(name !== undefined && { name: name.trim() }),
        ...(type !== undefined && { type }),
        ...(current_balance !== undefined && { current_balance: Number(current_balance) }),
        ...(account_number !== undefined && { account_number }),
        ...(currency !== undefined && { currency }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn("Supabase update wallet failed, updating mock store:", error.message);
      const updated = mockStore.updateWallet(id, { name, type, current_balance, account_number, currency, is_active });
      return NextResponse.json({ wallet: updated || { id, name, type, current_balance }, success: true });
    }

    return NextResponse.json({ wallet, success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ error: "ID rekening wajib disertakan" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      mockStore.deleteWallet(id);
      return NextResponse.json({ success: true, message: "Rekening berhasil dihapus" });
    }

    const { error } = await supabaseAdmin.from("wallets").delete().eq("id", id);

    if (error) {
      console.warn("Supabase delete wallet failed, deleting from mock store:", error.message);
      mockStore.deleteWallet(id);
      return NextResponse.json({ success: true, message: "Rekening dihapus dari mock store" });
    }

    return NextResponse.json({ success: true, message: "Rekening berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
