import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: assets, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ assets: assets || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, estimated_value, acquisition_date, notes, family_id } = body;

    if (!name || !category || estimated_value === undefined) {
      return NextResponse.json({ error: "Nama, kategori, dan estimasi nilai aset wajib diisi" }, { status: 400 });
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

    const { data: asset, error } = await supabaseAdmin
      .from("assets")
      .insert({
        family_id: targetFamilyId,
        name,
        category,
        estimated_value,
        acquisition_date: acquisition_date || new Date().toISOString(),
        notes: notes || null,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing asset id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("assets").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
