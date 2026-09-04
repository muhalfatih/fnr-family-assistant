import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ categories: mockStore.getCategories() });
    }

    const { data: categories, error } = await supabaseAdmin
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.warn("Supabase categories query error, falling back to mock:", error.message);
      return NextResponse.json({ categories: mockStore.getCategories() });
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (err: any) {
    console.warn("Error fetching categories, falling back to mock:", err.message);
    return NextResponse.json({ categories: mockStore.getCategories() });
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

    if (!isSupabaseConfigured()) {
      const newCategory = mockStore.addCategory({
        name: name.trim(),
        type,
        color,
        icon,
        is_default: false,
        initialTarget: Number(initialTarget || 0),
        monthYear,
      });
      return NextResponse.json({ category: newCategory }, { status: 201 });
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
      const newCategory = mockStore.addCategory({
        name: name.trim(),
        type,
        color,
        icon,
        is_default: false,
        initialTarget: Number(initialTarget || 0),
        monthYear,
      });
      return NextResponse.json({ category: newCategory }, { status: 201 });
    }

    // Insert category
    const { data: category, error: catErr } = await supabaseAdmin
      .from("categories")
      .insert({
        family_id: targetFamilyId,
        name: name.trim(),
        type,
        color,
        icon,
        is_default: false,
      })
      .select()
      .single();

    if (catErr) {
      console.warn("Supabase insert category failed, falling back to mock:", catErr.message);
      const newCategory = mockStore.addCategory({
        name: name.trim(),
        type,
        color,
        icon,
        is_default: false,
        initialTarget: Number(initialTarget || 0),
        monthYear,
      });
      return NextResponse.json({ category: newCategory }, { status: 201 });
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

    if (!isSupabaseConfigured()) {
      const updated = mockStore.updateCategory(id, {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      });
      if (!updated) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ category: updated });
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
      console.warn("Supabase update category failed, falling back to mock:", error.message);
      const updated = mockStore.updateCategory(id, {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      });
      return NextResponse.json({ category: updated });
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

    if (!isSupabaseConfigured()) {
      const existing = mockStore.getCategories().find((c) => c.id === id);
      if (existing?.is_default) {
        return NextResponse.json(
          { error: "Kategori bawaan sistem tidak dapat dihapus." },
          { status: 400 }
        );
      }
      const success = mockStore.deleteCategory(id, fallbackIdParam || undefined);
      if (!success) {
        return NextResponse.json({ error: "Kategori tidak ditemukan" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // Check if category is default in Supabase
    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id, is_default, type, family_id")
      .eq("id", id)
      .single();

    if (cat?.is_default) {
      return NextResponse.json(
        { error: "Kategori bawaan sistem tidak dapat dihapus." },
        { status: 400 }
      );
    }

    // Determine fallback category
    let fallbackId = fallbackIdParam;
    if (!fallbackId) {
      const { data: fallbackCat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("is_default", true)
        .eq("type", cat?.type || "expense")
        .limit(1)
        .single();
      fallbackId = fallbackCat?.id || null;
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
      console.warn("Supabase delete category error, falling back to mock:", delErr.message);
      mockStore.deleteCategory(id, fallbackId || undefined);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting category:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
