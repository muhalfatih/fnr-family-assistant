import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/security/password";

const FAMILY_PRESETS: Record<
  string,
  { id: string; name: string; email: string; role: string }
> = {
  "ayah@keluarga.hub": {
    id: "mem-001",
    name: "Ayah (Fatih)",
    email: "ayah@keluarga.hub",
    role: "admin",
  },
  "ibu@keluarga.hub": {
    id: "mem-002",
    name: "Ibu (Rania)",
    email: "ibu@keluarga.hub",
    role: "spouse",
  },
  "bunda@keluarga.hub": {
    id: "mem-002",
    name: "Ibu (Rania)",
    email: "ibu@keluarga.hub",
    role: "spouse",
  },
  "kakak@keluarga.hub": {
    id: "mem-003",
    name: "Kakak (Zaid)",
    email: "kakak@keluarga.hub",
    role: "member",
  },
  "adik@keluarga.hub": {
    id: "mem-004",
    name: "Adik (Maryam)",
    email: "adik@keluarga.hub",
    role: "member",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawIdentifier = body.identifier || body.email || "";
    const password = body.password || "";
    const rememberMe = body.rememberMe ?? true;

    if (!rawIdentifier || typeof rawIdentifier !== "string" || !rawIdentifier.trim()) {
      return NextResponse.json(
        { error: "Masukkan nomor WhatsApp, username Telegram, ID Telegram, nama, atau email Anda." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return NextResponse.json(
        { error: "Kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const cleanId = rawIdentifier.trim();
    const cleanPass = password.trim();
    const lowerId = cleanId.toLowerCase();
    const digitsOnly = cleanId.replace(/\D/g, "");
    const cleanTgUsername = cleanId.replace(/^@/, "").toLowerCase();
    const maybeNumericId = /^\d{6,16}$/.test(cleanId) ? Number(cleanId) : null;

    let user: { id: string; name: string; email: string; role: string } | null = null;
    let matchedMemberHash: string | null = null;

    // 1. Search in Supabase family_members table
    if (isSupabaseConfigured()) {
      try {
        const { data: dbMembers, error: memErr } = await supabaseAdmin
          .from("family_members")
          .select("id, full_name, role, whatsapp_number, telegram_chat_id, telegram_username, password_hash");

        if (!memErr && dbMembers && dbMembers.length > 0) {
          // A. WhatsApp phone match (handles 08xx, +62xx, 62xx)
          let matched = null;
          if (digitsOnly.length >= 7) {
            const sigDigits = digitsOnly.startsWith("62")
              ? digitsOnly.slice(2)
              : digitsOnly.startsWith("0")
              ? digitsOnly.slice(1)
              : digitsOnly;

            matched = dbMembers.find((m) => {
              const mDigits = String(m.whatsapp_number || "").replace(/\D/g, "");
              if (!mDigits) return false;
              const mSigDigits = mDigits.startsWith("62")
                ? mDigits.slice(2)
                : mDigits.startsWith("0")
                ? mDigits.slice(1)
                : mDigits;
              return mDigits === digitsOnly || mSigDigits === sigDigits || mDigits.endsWith(sigDigits);
            });
          }

          // B. Telegram username match
          if (!matched && cleanTgUsername) {
            matched = dbMembers.find(
              (m) =>
                m.telegram_username &&
                m.telegram_username.replace(/^@/, "").toLowerCase() === cleanTgUsername
            );
          }

          // C. Telegram Chat ID match
          if (!matched && maybeNumericId) {
            matched = dbMembers.find((m) => m.telegram_chat_id === maybeNumericId);
          }

          // D. Name exact or partial match
          if (!matched) {
            matched =
              dbMembers.find((m) => m.full_name?.toLowerCase() === lowerId) ||
              dbMembers.find((m) =>
                lowerId.length >= 3 && m.full_name?.toLowerCase().includes(lowerId)
              ) ||
              dbMembers.find((m) =>
                lowerId.length >= 3 && lowerId.includes(m.full_name?.toLowerCase())
              );
          }

          // E. Email preset alias match in DB roles
          if (!matched) {
            if (lowerId.includes("ayah") || lowerId.includes("fatih")) {
              matched = dbMembers.find((m) => m.role === "admin");
            } else if (
              lowerId.includes("ibu") ||
              lowerId.includes("bunda") ||
              lowerId.includes("rania")
            ) {
              matched = dbMembers.find((m) => m.role === "spouse");
            }
          }

          if (matched) {
            user = {
              id: matched.id,
              name: matched.full_name,
              email: matched.telegram_username
                ? `@${matched.telegram_username}`
                : matched.whatsapp_number || `${matched.full_name.toLowerCase().replace(/\s+/g, ".")}@keluarga.hub`,
              role: matched.role || "member",
            };
            matchedMemberHash = matched.password_hash || null;
          }
        }
      } catch (err) {
        console.warn("[Login] Supabase member lookup error:", err);
      }
    }

    // 2. Fallback to FAMILY_PRESETS if not matched in DB
    if (!user && FAMILY_PRESETS[lowerId]) {
      user = FAMILY_PRESETS[lowerId];
    }

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Akun tidak ditemukan. Pastikan nomor WhatsApp, username Telegram, ID Telegram, atau nama Anda sudah terdaftar di profil keluarga.",
        },
        { status: 404 }
      );
    }

    // 3. Password validation (Personal member password with family fallback)
    const validFamilyPasswords = [
      process.env.AUTH_PASSWORD,
      "keluarga123",
      "password123",
      "admin123",
      "keluarga",
    ].filter(Boolean);

    let isPasswordValid = false;

    // Check personal password hash first if member has set one
    if (matchedMemberHash) {
      isPasswordValid = verifyPassword(cleanPass, matchedMemberHash);
    }

    // Fallback to family password if personal check failed or member hasn't set personal password
    if (!isPasswordValid) {
      isPasswordValid = validFamilyPasswords.includes(cleanPass);
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error:
            "Kata sandi yang Anda masukkan salah. Silakan periksa kembali kata sandi akun Anda atau gunakan kata sandi keluarga.",
        },
        { status: 401 }
      );
    }

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

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan saat memproses login." },
      { status: 500 }
    );
  }
}
