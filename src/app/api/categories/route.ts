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
