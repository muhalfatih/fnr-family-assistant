import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getMonthDateRange } from "@/lib/utils";
import { mockStore } from "@/lib/mock-data";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get("period") || new Date().toISOString().substring(0, 7);

    if (!isSupabaseConfigured()) {
      const members = mockStore.getMembers();
      const wallets = mockStore.getWallets();
      const txs = mockStore.getTransactions(monthYear).filter((t) => t.type === "expense");

      const spentByMember: Record<string, number> = {};
      let unassignedSpent = 0;

      txs.forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.member_id) {
          spentByMember[tx.member_id] = (spentByMember[tx.member_id] || 0) + amt;
        } else {
          unassignedSpent += amt;
        }
      });

      const membersWithSpent = members.map((m) => ({
        ...m,
        default_wallet: wallets.find((w) => w.id === m.default_wallet_id) || null,
        monthlySpent: spentByMember[m.id] || 0,
      }));

      return NextResponse.json({
        members: membersWithSpent,
        unassignedSpent,
        monthYear,
      });
    }

    const { startDate, endDate } = getMonthDateRange(monthYear);

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      return NextResponse.json({ members: mockStore.getMembers(), unassignedSpent: 0, monthYear });
    }

    // 1. Fetch all members with default wallet
    const { data: members, error: memErr } = await supabaseAdmin
      .from("family_members")
      .select("*, default_wallet:wallets(*)")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true });

    if (memErr) {
      console.warn("Supabase members error, fallback to mock:", memErr.message);
      return NextResponse.json({ members: mockStore.getMembers(), unassignedSpent: 0, monthYear });
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
    console.warn("Error in GET members, fallback to mock:", err.message);
    return NextResponse.json({
      members: mockStore.getMembers(),
      unassignedSpent: 0,
      monthYear: "2026-09",
    });
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

    if (!isSupabaseConfigured()) {
      const newMem = mockStore.addMember({
        full_name: full_name.trim(),
        role: role === "admin" ? "admin" : "member",
        default_wallet_id: default_wallet_id || null,
        telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
        whatsapp_number: whatsapp_number?.trim() || null,
      });
      return NextResponse.json({ success: true, member: newMem });
    }

    const { data: families } = await supabaseAdmin.from("families").select("id").limit(1);
    const familyId = families && families.length > 0 ? families[0].id : null;

    if (!familyId) {
      const newMem = mockStore.addMember({
        full_name: full_name.trim(),
        role: role === "admin" ? "admin" : "member",
        default_wallet_id: default_wallet_id || null,
        telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
        whatsapp_number: whatsapp_number?.trim() || null,
      });
      return NextResponse.json({ success: true, member: newMem });
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
      console.warn("Supabase insert member failed, fallback to mock:", error.message);
      const newMem = mockStore.addMember({
        full_name: full_name.trim(),
        role: role === "admin" ? "admin" : "member",
        default_wallet_id: default_wallet_id || null,
        telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
        whatsapp_number: whatsapp_number?.trim() || null,
      });
      return NextResponse.json({ success: true, member: newMem });
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

    if (!isSupabaseConfigured()) {
      const updated = mockStore.updateMember(id, {
        full_name: full_name?.trim(),
        role: role === "admin" ? "admin" : "member",
        default_wallet_id: default_wallet_id || null,
        telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
        whatsapp_number: whatsapp_number?.trim() || null,
      });
      return NextResponse.json({ success: true, member: updated });
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
      const updated = mockStore.updateMember(id, {
        full_name: full_name?.trim(),
        role: role === "admin" ? "admin" : "member",
        default_wallet_id: default_wallet_id || null,
        telegram_chat_id: telegram_chat_id ? Number(telegram_chat_id) : null,
        whatsapp_number: whatsapp_number?.trim() || null,
      });
      return NextResponse.json({ success: true, member: updated });
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

    if (!isSupabaseConfigured()) {
      mockStore.deleteMember(id);
      return NextResponse.json({ success: true, id });
    }

    const { error } = await supabaseAdmin.from("family_members").delete().eq("id", id);

    if (error) {
      mockStore.deleteMember(id);
      return NextResponse.json({ success: true, id });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
