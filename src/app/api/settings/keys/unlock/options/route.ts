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

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabaseAdmin
          .from("family_members")
          .select("id, full_name, role, whatsapp_number, telegram_chat_id, telegram_username")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (!error && data) {
          memberProfile = data;
        }
      } catch (err) {
        console.warn("[UnlockOptions] Supabase error:", err);
      }
    }

    if (!memberProfile) {
      const allMock = mockStore.getMembers();
      memberProfile =
        allMock.find((m) => m.id === sessionUser.id) ||
        allMock.find((m) => m.full_name.toLowerCase().includes(sessionUser.name?.toLowerCase() || "")) ||
        allMock[0];
    }

    const hasTelegram = Boolean(memberProfile?.telegram_chat_id);
    const hasWhatsapp = Boolean(memberProfile?.whatsapp_number);

    const telegramTarget = hasTelegram
      ? memberProfile.telegram_username
        ? `@${memberProfile.telegram_username.replace(/^@/, "")}`
        : maskTarget(String(memberProfile.telegram_chat_id), "telegram")
      : null;

    const whatsappTarget = hasWhatsapp
      ? maskTarget(memberProfile.whatsapp_number, "whatsapp")
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
