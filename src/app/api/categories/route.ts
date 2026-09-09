import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Supabase categories query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pastikan kategori default "Lainnya" selalu tersedia
    if (categories && !categories.some((c) => c.name.toLowerCase() === "lainnya" && c.type === "expense")) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      const famId = families && families.length > 0 ? families[0].id : null;
      if (famId) {
        await supabaseAdmin.from("categories").insert({
          family_id: famId,
          name: "Lainnya",
          type: "expense",
          color: "#64748b",
          icon: "Tag",
          is_default: true,
        });
      }
    }

    // Pastikan kategori default pemasukan tersedia jika belum ada
    if (categories && !categories.some((c) => c.type === "income")) {
      const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
      const famId = families && families.length > 0 ? families[0].id : null;
      if (famId) {
        await supabaseAdmin.from("categories").insert([
          {
            family_id: famId,
            name: "Gaji & Pendapatan Tetap",
            type: "income",
            color: "#10b981",
            icon: "Briefcase",
            is_default: true,
          },
          {
            family_id: famId,
            name: "Dividen & Investasi",
            type: "income",
            color: "#3b82f6",
            icon: "TrendingUp",
            is_default: true,
          },
          {
            family_id: famId,
            name: "Bisnis & Jasa",
            type: "income",
            color: "#8b5cf6",
            icon: "Store",
            is_default: true,
          },
          {
            family_id: famId,
            name: "Pemasukan Lainnya",
            type: "income",
            color: "#64748b",
            icon: "Tag",
            is_default: true,
          },
        ]);
      }
    }

    const { data: latestCategories } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    const rawList = latestCategories || categories || [];
    // Deduplikasi defensif berdasarkan tipe & nama
    const seen = new Map<string, any>();
    for (const c of rawList) {
      const key = `${c.type || "expense"}-${c.name.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.set(key, c);
      } else if (c.is_default && !seen.get(key)!.is_default) {
        seen.set(key, c);
      }
    }

    return NextResponse.json({ categories: Array.from(seen.values()) });
  } catch (err: any) {
    console.error("Error fetching categories:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      type = "expense",
      color = "#3b82f6",
      icon = "Tag",
      initialTarget = 0,
      monthYear = new Date().toISOString().substring(0, 7),
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    const trimmedName = name.trim();
    if (trimmedName.toLowerCase() === "lainnya") {
      return NextResponse.json(
        { error: "Kategori 'Lainnya' sudah ada sebagai kategori default." },
        { status: 400 }
      );
    }

    // Resolve family ID
    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    let targetFamilyId = families && families.length > 0 ? families[0].id : null;

    if (!targetFamilyId) {
      const { data: newFam } = await supabaseAdmin
        .from("families")
        .insert({ name: "Keluarga F&R", currency: "IDR" })
        .select("id")
        .single();
      targetFamilyId = newFam?.id;
    }

    if (!targetFamilyId) {
      return NextResponse.json({ error: "Keluarga tidak ditemukan." }, { status: 400 });
    }

    // Check duplicate in Supabase
    const { data: duplicateCheck } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("type", type)
      .ilike("name", trimmedName)
      .limit(1);

    if (duplicateCheck && duplicateCheck.length > 0) {
      return NextResponse.json(
        { error: `Kategori "${trimmedName}" sudah ada.` },
        { status: 400 }
      );
    }

    // Insert category
    const { data: category, error: catErr } = await supabaseAdmin
      .from("categories")
      .insert({
        family_id: targetFamilyId,
        name: trimmedName,
        type,
        color,
        icon,
        is_default: false,
      })
      .select()
      .single();

    if (catErr) {
      console.error("Supabase insert category failed:", catErr.message);
      return NextResponse.json({ error: catErr.message || "Gagal menambahkan kategori" }, { status: 400 });
    }

    // If initialTarget specified, insert into budgets
    if (initialTarget && Number(initialTarget) > 0) {
      await supabaseAdmin.from("budgets").insert({
        family_id: targetFamilyId,
        category_id: category.id,
        target_amount: Number(initialTarget),
        period: "monthly",
        month_year: monthYear,
      });
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating category:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, color, icon } = body;

    if (!id) {
      return NextResponse.json({ error: "ID kategori wajib disertakan" }, { status: 400 });
    }

    // Periksa apakah kategori adalah default "Lainnya"
    const { data: existingCat } = await supabaseAdmin
      .from("categories")
      .select("id, name, is_default")
      .eq("id", id)
      .single();

    if (existingCat?.name.toLowerCase() === "lainnya" && existingCat?.is_default && name && name.trim().toLowerCase() !== "lainnya") {
      return NextResponse.json({ error: "Nama kategori default 'Lainnya' tidak dapat diubah." }, { status: 400 });
    }

    const { data: category, error } = await supabaseAdmin
      .from("categories")
      .update({
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Supabase update category failed:", error.message);
      return NextResponse.json({ error: error.message || "Gagal memperbarui kategori" }, { status: 400 });
    }

    return NextResponse.json({ category });
  } catch (err: any) {
    console.error("Error updating category:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const fallbackIdParam = searchParams.get("fallbackId");

    if (!id) {
      return NextResponse.json({ error: "ID kategori wajib disertakan" }, { status: 400 });
    }

    // Check if category is default in Supabase
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id, name, is_default, type, family_id")
      .eq("id", id)
      .single();

    if (cat?.name.toLowerCase() === "lainnya" || cat?.is_default) {
      return NextResponse.json(
        { error: "Kategori default 'Lainnya' tidak dapat dihapus." },
        { status: 400 }
      );
    }

    // Determine fallback category (utamakan kategori Lainnya)
    let fallbackId = fallbackIdParam;
    if (!fallbackId) {
      const { data: lainnyaCat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .ilike("name", "lainnya")
        .eq("type", cat?.type || "expense")
        .limit(1)
        .maybeSingle();

      if (lainnyaCat) {
        fallbackId = lainnyaCat.id;
      } else {
        const { data: fallbackCat } = await supabaseAdmin
          .from("categories")
          .select("id")
          .eq("is_default", true)
          .eq("type", cat?.type || "expense")
          .limit(1)
          .single();
        fallbackId = fallbackCat?.id || null;
      }
    }

    // Reassign existing transactions to fallback category
    if (fallbackId) {
      await supabaseAdmin
        .from("transactions")
        .update({ category_id: fallbackId })
        .eq("category_id", id);
    }

    // Delete budgets for this category
    await supabaseAdmin.from("budgets").delete().eq("category_id", id);

    // Delete category
    const { error: delErr } = await supabaseAdmin.from("categories").delete().eq("id", id);
    if (delErr) {
      console.error("Supabase delete category error:", delErr.message);
      return NextResponse.json({ error: delErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting category:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
