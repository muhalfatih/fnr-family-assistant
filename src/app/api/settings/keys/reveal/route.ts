import { NextRequest, NextResponse } from "next/server";
import { getAllDecryptedSecrets } from "@/lib/security/secret-manager";
import {
  verifyUnlockToken,
  UNLOCK_COOKIE_NAME,
} from "@/lib/security/unlock-token";

export async function GET(req: NextRequest) {
  try {
    // 1. Check user session
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
        { ok: false, error: "Hanya Pengelola Keluarga (Admin / Pasangan) yang dapat melihat Kunci API." },
        { status: 403 }
      );
    }

    // 2. Check unlock token
    const unlockCookie = req.cookies.get(UNLOCK_COOKIE_NAME)?.value;
    const unlockAuth = verifyUnlockToken(unlockCookie);

    if (!unlockAuth.valid || !unlockAuth.payload) {
      return NextResponse.json(
        {
          ok: false,
          isLocked: true,
          error: "Akses kunci API masih terkunci. Silakan verifikasi kata sandi atau OTP untuk melihat.",
        },
        { status: 403 }
      );
    }

    // 3. Fetch all decrypted secrets
    const secrets = await getAllDecryptedSecrets();

    return NextResponse.json({
      ok: true,
      isLocked: false,
      keys: secrets,
      expiresAt: unlockAuth.payload.expiresAt,
      remainingSeconds: unlockAuth.remainingSeconds,
    });
  } catch (err: any) {
    console.error("[KeysReveal] Exception:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal mendekripsi kunci API." },
      { status: 500 }
    );
  }
}
