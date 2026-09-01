import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: liabilities, error } = await supabaseAdmin
      .from("liabilities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ liabilities: liabilities || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      total_amount,
      remaining_amount,
      monthly_installment,
      due_date_day,
      notes,
      family_id,
    } = body;

    if (!name || !type || total_amount === undefined || remaining_amount === undefined) {
      return NextResponse.json({ error: "Nama, tipe, total, dan sisa hutang wajib diisi" }, { status: 400 });
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

    const { data: liability, error } = await supabaseAdmin
      .from("liabilities")
      .insert({
        family_id: targetFamilyId,
        name,
        type,
        total_amount,
        remaining_amount,
        monthly_installment: monthly_installment || 0,
        due_date_day: due_date_day || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ liability }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing liability id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("liabilities").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
