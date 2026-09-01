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
