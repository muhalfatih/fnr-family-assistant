import { NextRequest, NextResponse } from "next/server";
import { issueOtp, createSignedChallenge, maskTarget } from "@/lib/auth-otp";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify caller session
    const sessionCookie = req.cookies.get("fnr_session");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { ok: false, error: "Sesi tidak ditemukan. Silakan login kembali." },
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
        { ok: false, error: "Hanya Pengelola Keluarga (Admin / Pasangan) yang dapat membuka Kunci API." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { channel } = body;

    if (channel !== "telegram" && channel !== "whatsapp") {
      return NextResponse.json(
        { ok: false, error: "Kanal pengiriman OTP tidak valid (wajib 'telegram' atau 'whatsapp')." },
        { status: 400 }
      );
    }

    let memberProfile: any = null;

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
        }
      }
    } catch (err) {
      console.warn("[UnlockRequest] Supabase fetch error:", err);
    }

    if (!memberProfile) {
      return NextResponse.json(
        { ok: false, error: "Profil anggota keluarga Anda tidak ditemukan di sistem." },
        { status: 404 }
      );
    }

    const rawWa = memberProfile.whatsapp_number ? String(memberProfile.whatsapp_number).trim() : "";
    const rawTg = memberProfile.telegram_chat_id ? String(memberProfile.telegram_chat_id).trim() : "";

    const authUser = {
      id: memberProfile.id,
      name: memberProfile.full_name,
      email: sessionUser.email || "ayah@keluarga.hub",
      role: memberProfile.role || sessionUser.role,
      telegramChatId: rawTg && rawTg !== "0" ? Number(rawTg) : null,
      telegramUsername: memberProfile.telegram_username ? String(memberProfile.telegram_username).replace(/^@/, "").trim() : null,
      whatsappNumber: rawWa && rawWa.length >= 6 ? rawWa : null,
    };

    let targetIdentifier = "";
    if (channel === "telegram") {
      if (!authUser.telegramChatId) {
        return NextResponse.json(
          {
            ok: false,
            error: `Akun Anda (${authUser.name}) belum terhubung dengan Telegram Chat ID di database. Buka bot Telegram dan ketik /start untuk menghubungkan.`,
          },
          { status: 400 }
        );
      }
      targetIdentifier = String(authUser.telegramChatId);
    } else {
      if (!authUser.whatsappNumber) {
        return NextResponse.json(
          {
            ok: false,
            error: `Akun Anda (${authUser.name}) belum memiliki nomor WhatsApp terdaftar di database.`,
          },
          { status: 400 }
        );
      }
      targetIdentifier = authUser.whatsappNumber;
    }

    // 3. Issue OTP
    const issue = issueOtp(channel, targetIdentifier, authUser);
    if (!issue.success || !issue.record) {
      return NextResponse.json(
        {
          ok: false,
          error: issue.error || "Gagal menerbitkan kode verifikasi.",
          cooldownRemaining: issue.cooldownRemaining,
        },
        { status: 429 }
      );
    }

    const { record } = issue;

    // 4. Send the message via Telegram or WhatsApp
    const messageText = [
      `🔐 *F&R Family Hub — Buka Kunci API*`,
      ``,
      `Halo *${authUser.name}*,`,
      `Kode verifikasi Anda untuk membuka tampilan kunci API:`,
      ``,
      `*${record.code}*`,
      ``,
      `_Kode ini berlaku selama 5 menit. Jangan bagikan kepada siapa pun demi keamanan keuangan keluarga._`,
    ].join("\n");

    let dispatchSuccess = false;
    let dispatchError: any = null;

    if (channel === "telegram") {
      try {
        const tgRes = await sendTelegramMessage(authUser.telegramChatId!, messageText);
        dispatchSuccess = Boolean(tgRes?.ok);
      } catch (err: any) {
        dispatchError = err.message;
      }
    } else {
      try {
        const waRes = await sendWhatsAppTextMessage(authUser.whatsappNumber!, messageText);
        dispatchSuccess = Boolean(waRes?.ok);
      } catch (err: any) {
        dispatchError = err.message;
      }
    }

    const challengeCookie = createSignedChallenge(record);
    const maskedTarget = maskTarget(targetIdentifier, channel);

    const response = NextResponse.json({
      ok: true,
      message: `Kode verifikasi 6-digit telah dikirim ke ${channel === "telegram" ? "Telegram" : "WhatsApp"} (${maskedTarget}).`,
      channel,
      targetDisplay: maskedTarget,
      delivered: dispatchSuccess,
      warning: !dispatchSuccess ? `Gagal mengirim otomatis: ${dispatchError || "Periksa konfigurasi bot"}. Dalam mode pengembangan, Anda dapat menggunakan kode OTP yang tercetak di konsol server.` : undefined,
    });

    response.cookies.set("fnr_otp_challenge", challengeCookie, {
      path: "/",
      maxAge: 300,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err: any) {
    console.error("[UnlockRequest] Exception:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal memproses permintaan kode verifikasi." },
      { status: 500 }
    );
  }
}
