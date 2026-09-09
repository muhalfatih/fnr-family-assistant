import { NextRequest, NextResponse } from "next/server";
import { findMemberByIdentifier, issueOtp, createSignedChallenge } from "@/lib/auth-otp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp/client";
import { sendTelegramMessage } from "@/lib/telegram/bot";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, identifier } = body;

    if (!channel || (channel !== "whatsapp" && channel !== "telegram")) {
      return NextResponse.json(
        { error: "Kanal pengiriman wajib dipilih (WhatsApp atau Telegram)." },
        { status: 400 }
      );
    }

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      const fieldName = channel === "whatsapp" ? "Nomor WhatsApp" : "Username atau ID Chat Telegram";
      return NextResponse.json(
        { error: `${fieldName} wajib diisi.` },
        { status: 400 }
      );
    }

    // 1. Cari anggota keluarga terdaftar (di database Supabase / mock data)
    const user = await findMemberByIdentifier(channel, identifier.trim());
    if (!user) {
      const msg =
        channel === "whatsapp"
          ? "Nomor WhatsApp belum terdaftar dalam daftar anggota keluarga."
          : "Username atau ID Chat Telegram belum terdaftar dalam anggota keluarga.";
      return NextResponse.json({ error: msg }, { status: 404 });
    }

    // Jika login Telegram tetapi profil belum ditautkan dengan Chat ID numerik
    const numericInput = identifier.trim().replace(/^id:?\s*/i, "").replace(/^@/, "");
    const isDirectChatId =
      /^\d{5,12}$/.test(numericInput) &&
      !numericInput.startsWith("08") &&
      !numericInput.startsWith("628");
    const resolvedChatId = user.telegramChatId || (isDirectChatId ? numericInput : null);

    if (channel === "telegram" && !resolvedChatId) {
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || "fnr_assistant_bot";
      return NextResponse.json(
        {
          error: `Akun anggota "${user.name}" ditemukan, namun bot Telegram belum diaktifkan oleh akun Anda. Silakan buka bot @${botUsername} lalu ketik /start atau bagikan kontak untuk mengaktifkannya secara otomatis.`,
          needsTelegramActivation: true,
          memberName: user.name,
          botUsername,
          hasWhatsapp: Boolean(user.whatsappNumber),
        },
        { status: 400 }
      );
    }

    // 2. Terbitkan OTP dan Magic Token
    const issue = issueOtp(channel, identifier.trim(), user);
    if (!issue.success || !issue.record) {
      return NextResponse.json(
        {
          error: issue.error || "Gagal membuat kode verifikasi.",
          cooldownRemaining: issue.cooldownRemaining,
        },
        { status: 429 }
      );
    }

    const { record } = issue;

    // 3. Susun URL Magic Link & Teks Pesan
    const origin =
      req.headers.get("x-forwarded-host")
        ? `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("x-forwarded-host")}`
        : req.nextUrl.origin || "http://localhost:1000";

    const magicLink = `${origin}/login?token=${record.magicToken}`;

    const messageText = [
      `🔐 *F&R Family Hub — Kode Masuk*`,
      ``,
      `Halo *${record.user.name}*,`,
      `Kode verifikasi Anda untuk masuk ke dashboard:`,
      ``,
      `👉 *${record.code}*`,
      ``,
      `Atau langsung klik tautan instan berikut untuk masuk:`,
      `🔗 ${magicLink}`,
      ``,
      `⏱️ _Berlaku 5 menit. Jangan bagikan kode ini kepada siapapun._`,
    ].join("\n");

    let isDispatched = false;
    let dispatchError: string | null = null;

    // 4. Kirimkan pesan melalui Bot API yang sesuai
    if (channel === "whatsapp") {
      try {
        const targetPhone = user.whatsappNumber || record.identifier;
        const waResult = await sendWhatsAppTextMessage(targetPhone, messageText);
        if (waResult.ok) {
          isDispatched = true;
        } else {
          dispatchError = waResult.error || "whatsapp_delivery_failed";
        }
      } catch (err: any) {
        dispatchError = err.message || "whatsapp_error";
      }
    } else if (channel === "telegram") {
      try {
        const targetChatId = resolvedChatId || user.telegramChatId!;
        const tgResult = await sendTelegramMessage(targetChatId, messageText);
        if (tgResult && tgResult.ok) {
          isDispatched = true;
        } else {
          dispatchError = tgResult?.description || "telegram_delivery_failed";
        }
      } catch (err: any) {
        dispatchError = err.message || "telegram_error";
      }
    }

    // 5. Kembalikan respons berhasil beserta info fallback simulasi (agar testing aman jika API bot offline/dev)
    const challengeToken = createSignedChallenge(record);

    const response = NextResponse.json({
      success: true,
      message: `Kode masuk dan tautan verifikasi telah dikirim ke ${record.targetDisplay}.`,
      targetDisplay: record.targetDisplay,
      channel: record.channel,
      expiresIn: 300,
      resendCooldown: 60,
      deliveredLive: isDispatched,
      // Kode bantuan pengujian untuk lingkungan dev / testing
      devCode: process.env.NODE_ENV !== "production" ? record.code : undefined,
      devMagicLink: process.env.NODE_ENV !== "production" ? magicLink : undefined,
      simulation: !isDispatched
        ? {
            active: true,
            code: record.code,
            magicLink,
            note: "API Bot belum terhubung atau dalam mode simulasi pengujian. Gunakan kode ini untuk masuk.",
          }
        : undefined,
    });

    // Set signed challenge cookie (berlaku 5 menit) untuk ketahanan serverless di Vercel
    response.cookies.set("fnr_otp_challenge", challengeToken, {
      path: "/",
      maxAge: 300,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan pada server saat mengirim kode verifikasi." },
      { status: 500 }
    );
  }
}
