import { NextRequest, NextResponse } from "next/server";
import { maskTarget } from "@/lib/auth-otp";
import { mockStore } from "@/lib/mock-data";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get("fnr_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak ditemukan." },
        { status: 401 }
      );
    }

    let sessionUser: any;
    try {
      sessionUser = JSON.parse(decodeURIComponent(sessionCookie.value));
    } catch {
      return NextResponse.json({ ok: false, error: "Sesi tidak valid." }, { status: 401 });
    }

    if (sessionUser.role !== "admin" && sessionUser.role !== "spouse") {
      return NextResponse.json(
        { ok: false, error: "Hanya Pengelola Keluarga yang berhak mengakses pengaturan ini." },
        { status: 403 }
      );
    }

    let memberProfile: any = null;
    let isFromDatabase = false;

    // 1. Jika Supabase terhubung, prioritaskan data asli dari database
    if (isSupabaseConfigured()) {
      try {
        const { data: dbMembers, error } = await supabaseAdmin
          .from("family_members")
          .select("id, full_name, role, whatsapp_number, telegram_chat_id, telegram_username");

        if (!error && dbMembers && dbMembers.length > 0) {
          const matched =
            dbMembers.find((m) => m.id === sessionUser.id) ||
            dbMembers.find((m) => m.full_name?.toLowerCase().includes(sessionUser.name?.toLowerCase() || "")) ||
            dbMembers.find((m) => m.role === sessionUser.role);

          if (matched) {
            memberProfile = matched;
            isFromDatabase = true;
          }
        }
      } catch (err) {
        console.warn("[UnlockOptions] Supabase error:", err);
      }
    }

    // 2. Mockup HANYA digunakan jika Supabase tidak terhubung sama sekali / database kosong
    if (!isFromDatabase && !isSupabaseConfigured()) {
      const allMock = mockStore.getMembers();
      memberProfile =
        allMock.find((m) => m.id === sessionUser.id) ||
        allMock.find((m) => m.full_name?.toLowerCase().includes(sessionUser.name?.toLowerCase() || "")) ||
        allMock.find((m) => m.role === sessionUser.role) ||
        null;
    }

    // Evaluasi kanal keamanan murni berdasarkan profil asli (tidak pernah menginjeksikan data tiruan)
    const rawWa = memberProfile?.whatsapp_number ? String(memberProfile.whatsapp_number).trim() : "";
    const rawTgChatId = memberProfile?.telegram_chat_id ? String(memberProfile.telegram_chat_id).trim() : "";

    const hasWhatsapp = Boolean(rawWa && rawWa.length >= 6);
    const hasTelegram = Boolean(rawTgChatId && rawTgChatId !== "0");

    const telegramTarget = hasTelegram
      ? memberProfile.telegram_username
        ? `@${memberProfile.telegram_username.replace(/^@/, "")}`
        : maskTarget(rawTgChatId, "telegram")
      : null;

    const whatsappTarget = hasWhatsapp
      ? maskTarget(rawWa, "whatsapp")
      : null;

    return NextResponse.json({
      ok: true,
      channels: {
        telegram: {
          available: hasTelegram,
          targetDisplay: telegramTarget,
        },
        whatsapp: {
          available: hasWhatsapp,
          targetDisplay: whatsappTarget,
        },
        password: {
          available: true,
        },
      },
      hasAnyChatChannel: hasTelegram || hasWhatsapp,
    });
  } catch (err: any) {
    console.error("[UnlockOptions] Exception:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal memuat opsi keamanan." },
      { status: 500 }
    );
  }
}
