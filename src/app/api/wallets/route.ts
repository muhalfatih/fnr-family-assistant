import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: wallets, error } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Wallets API] Supabase query error:", error.message);
      return NextResponse.json({ error: error.message, wallets: [] }, { status: 500 });
    }

    return NextResponse.json({ wallets: wallets || [] });
  } catch (err: any) {
    console.error("[Wallets API] Exception:", err.message);
    return NextResponse.json({ error: err.message, wallets: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, current_balance, currency = "IDR", family_id } = body;

    if (!name || !type) {
      return NextResponse.json({ error: "Nama dan tipe rekening wajib diisi" }, { status: 400 });
    }

    let targetFamilyId = family_id;
    if (!targetFamilyId) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      targetFamilyId = families && families.length > 0 ? families[0].id : null;
    }

    if (!targetFamilyId) {
      return NextResponse.json({ error: "Keluarga belum terdaftar di Supabase" }, { status: 400 });
    }

    const { data: wallet, error } = await supabaseAdmin
      .from("wallets")
      .insert({
        family_id: targetFamilyId,
        name: name.trim(),
        type,
        current_balance: Number(current_balance) || 0,
        currency,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Wallets API] Add wallet failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      console.error("[Wallets API] Update wallet failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { error } = await supabaseAdmin.from("wallets").delete().eq("id", id);

    if (error) {
      console.error("[Wallets API] Delete wallet failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Rekening berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
