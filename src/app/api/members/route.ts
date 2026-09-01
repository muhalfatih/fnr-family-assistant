import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("period") || new Date().toISOString().substring(0, 7);
    const { startDate, endDate } = getMonthDateRange(monthYear);

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ members: [] });
    }

    // 1. Fetch all members with default wallet
    const { data: members, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("*, default_wallet:wallets(*)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // 2. Fetch monthly transactions to calculate spent per member
    const { data: monthlyTx } = await supabaseAdmin
      .from("transactions")
      .select("member_id, amount, type")
      .eq("family_id", familyId)
      .eq("type", "expense")
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    const spentByMember: Record<string, number> = {};
    let unassignedSpent = 0;

    if (monthlyTx) {
      monthlyTx.forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.member_id) {
          spentByMember[tx.member_id] = (spentByMember[tx.member_id] || 0) + amt;
        } else {
          unassignedSpent += amt;
        }
      });
    }

    const membersWithSpent = (members || []).map((m: any) => ({
      ...m,
      monthlySpent: spentByMember[m.id] || 0,
    }));

    return NextResponse.json({
      members: membersWithSpent,
      unassignedSpent,
      monthYear,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      role = "member",
      default_wallet_id,
      telegram_chat_id,
      whatsapp_number,
      avatar_url,
    } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: "Nama lengkap anggota wajib diisi" }, { status: 400 });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ error: "Keluarga belum terdaftar" }, { status: 400 });
    }

    const payload: any = {
      family_id: familyId,
      full_name: full_name.trim(),
      role: role === "admin" ? "admin" : "member",
      default_wallet_id: default_wallet_id || null,
      telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
      whatsapp_number: whatsapp_number?.trim() || null,
      avatar_url: avatar_url?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from("family_members")
      .insert(payload)
      .select("*, default_wallet:wallets(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      full_name,
      role,
      default_wallet_id,
      telegram_chat_id,
      whatsapp_number,
      avatar_url,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
    }

    const payload: any = {
      full_name: full_name?.trim(),
      role: role === "admin" ? "admin" : "member",
      default_wallet_id: default_wallet_id || null,
      telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
      whatsapp_number: whatsapp_number?.trim() || null,
      avatar_url: avatar_url?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from("family_members")
      .update(payload)
      .eq("id", id)
      .select("*, default_wallet:wallets(*)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, member: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("family_members").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
