import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface VaultDocument {
  id: string;
  family_id: string;
  member_id?: string | null;
  title: string;
  category: string;
  document_number?: string | null;
  drive_file_id?: string | null;
  drive_view_url?: string | null;
  file_path?: string | null;
  expiry_date?: string | null;
  reminder_days_before: number;
  metadata: Record<string, any>;
  created_at: string;
  // Computed fields
  daysRemaining?: number | null;
  status: "active" | "expiring_soon" | "expired" | "permanent";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status");

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ documents: [] });
    }

    let query = supabaseAdmin
      .from("documents")
      .select("*")
      .eq("family_id", familyId)
      .order("expiry_date", { ascending: true, nullsFirst: false });

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const documents: VaultDocument[] = (data || []).map((doc: any) => {
      let daysRemaining: number | null = null;
      let docStatus: VaultDocument["status"] = "permanent";

      if (doc.expiry_date) {
        const exp = new Date(doc.expiry_date);
        exp.setHours(0, 0, 0, 0);
        const diffTime = exp.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const reminderThreshold = doc.reminder_days_before || 30;

        if (daysRemaining < 0) {
          docStatus = "expired";
        } else if (daysRemaining <= reminderThreshold) {
          docStatus = "expiring_soon";
        } else {
          docStatus = "active";
        }
      }

      return {
        ...doc,
        daysRemaining,
        status: docStatus,
      };
    });

    // Optional status filter
    const filteredDocs = status && status !== "all"
      ? documents.filter((d) => d.status === status)
      : documents;

    return NextResponse.json({ documents: filteredDocs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      category = "identity",
      document_number,
      expiry_date,
      reminder_days_before = 30,
      drive_view_url,
      metadata = {},
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Judul dokumen wajib diisi" }, { status: 400 });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ error: "Keluarga tidak ditemukan" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("documents")
      .insert({
        family_id: familyId,
        title: title.trim(),
        category,
        document_number: document_number?.trim() || null,
        expiry_date: expiry_date || null,
        reminder_days_before: Number(reminder_days_before) || 30,
        drive_view_url: drive_view_url?.trim() || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      title,
      category,
      document_number,
      expiry_date,
      reminder_days_before,
      drive_view_url,
      metadata,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("documents")
      .update({
        title: title?.trim(),
        category,
        document_number: document_number?.trim() || null,
        expiry_date: expiry_date || null,
        reminder_days_before: Number(reminder_days_before) || 30,
        drive_view_url: drive_view_url?.trim() || null,
        metadata: metadata || {},
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing document id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("documents").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
