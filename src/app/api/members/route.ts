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
      return NextResponse.json({ members: [], unassignedSpent: 0, monthYear });
    }

    // 1. Fetch all members with default wallet
    const { data: members, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("*, default_wallet:wallets(*)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (memErr) {
      console.error("Supabase members error:", memErr.message);
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
    console.error("Error in GET members:", err);
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
      telegram_username,
      whatsapp_number,
      avatar_url,
    } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json({ error: "Nama lengkap anggota wajib diisi" }, { status: 400 });
    }

    const validatedRole = role === "admin" ? "admin" : role === "spouse" ? "spouse" : "member";

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    let familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      const { data: newFam } = await supabaseAdmin
        .from("families")
        .insert({ name: "Keluarga F&R", currency: "IDR" })
        .select("id")
        .single();
      familyId = newFam?.id;
    }

    if (!familyId) {
      return NextResponse.json({ error: "Keluarga tidak ditemukan." }, { status: 400 });
    }

    const payload: any = {
      family_id: familyId,
      full_name: full_name.trim(),
      role: validatedRole,
      default_wallet_id: default_wallet_id || null,
      telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
      telegram_username: telegram_username ? telegram_username.replace(/^@/, "").trim() : null,
      whatsapp_number: whatsapp_number?.trim() || null,
      avatar_url: avatar_url?.trim() || null,
    };

    const { data, error } = await supabaseAdmin
      .from("family_members")
      .insert(payload)
      .select("*, default_wallet:wallets(*)")
      .single();

    if (error) {
      console.error("Supabase insert member failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
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
      telegram_username,
      whatsapp_number,
      avatar_url,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing member id" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (full_name !== undefined) updatePayload.full_name = full_name ? full_name.trim() : "";
    if (role !== undefined) {
      updatePayload.role = role === "admin" ? "admin" : role === "spouse" ? "spouse" : "member";
    }
    if (default_wallet_id !== undefined) updatePayload.default_wallet_id = default_wallet_id || null;
    if (telegram_chat_id !== undefined) updatePayload.telegram_chat_id = telegram_chat_id ? Number(telegram_chat_id) : null;
    if (telegram_username !== undefined) {
      updatePayload.telegram_username = telegram_username ? telegram_username.replace(/^@/, "").trim() : null;
    }
    if (whatsapp_number !== undefined) updatePayload.whatsapp_number = whatsapp_number?.trim() || null;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from("family_members")
      .update(updatePayload)
      .eq("id", id)
      .select("*, default_wallet:wallets(*)")
      .single();

    if (error) {
      console.error("Supabase update member failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
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
      console.error("Supabase delete member failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
