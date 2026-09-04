import { NextRequest, NextResponse } from "next/server";
import { verifyOtpCode, verifyMagicToken } from "@/lib/auth-otp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channel, identifier, code, token, rememberMe = true } = body;

    const challengeCookie = req.cookies.get("fnr_otp_challenge")?.value;
    let verificationResult;

    // 1. Verifikasi via Magic Link Token
    if (token && typeof token === "string" && token.trim()) {
      verificationResult = verifyMagicToken(token.trim(), challengeCookie);
    }
    // 2. Verifikasi via Kode OTP 6 Digit
    else if (code && typeof code === "string" && code.trim()) {
      if (!channel || (channel !== "whatsapp" && channel !== "telegram")) {
        return NextResponse.json(
          { error: "Kanal login (WhatsApp atau Telegram) diperlukan untuk verifikasi kode." },
          { status: 400 }
        );
      }
      if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
        return NextResponse.json(
          { error: "Nomor WhatsApp atau ID Telegram diperlukan untuk verifikasi kode." },
          { status: 400 }
        );
      }

      verificationResult = verifyOtpCode(channel, identifier.trim(), code.trim(), challengeCookie);
    } else {
      return NextResponse.json(
        { error: "Kode verifikasi 6 digit atau tautan masuk wajib disertakan." },
        { status: 400 }
      );
    }

    if (!verificationResult.success || !verificationResult.user) {
      return NextResponse.json(
        { error: verificationResult.error || "Verifikasi gagal." },
        { status: 400 }
      );
    }

    const user = verificationResult.user;

    const sessionData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      loginAt: new Date().toISOString(),
    };

    const maxAge = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
    const sessionCookieValue = encodeURIComponent(JSON.stringify(sessionData));

    const response = NextResponse.json({
      success: true,
      user: sessionData,
      message: `Selamat datang kembali, ${user.name}!`,
    });

    response.cookies.set("fnr_session", sessionCookieValue, {
      path: "/",
      maxAge,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    response.cookies.delete("fnr_otp_challenge");

    return response;
  } catch (err: any) {
    console.error("OTP verification error:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan saat memverifikasi kode login." },
      { status: 500 }
    );
  }
}
