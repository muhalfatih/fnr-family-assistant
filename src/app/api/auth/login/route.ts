import { NextRequest, NextResponse } from "next/server";
import { mockStore } from "@/lib/mock-data";

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
    role: "admin",
  },
  "bunda@keluarga.hub": {
    id: "mem-002",
    name: "Ibu (Rania)",
    email: "ibu@keluarga.hub",
    role: "admin",
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
    const { email, password, rememberMe = true } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Alamat email wajib diisi." },
        { status: 400 }
      );
    }

    if (!password || !password.trim()) {
      return NextResponse.json(
        { error: "Kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = FAMILY_PRESETS[cleanEmail];

    if (!user) {
      const members = mockStore.getMembers();
      const matched = members.find((m) =>
        m.full_name.toLowerCase().includes(cleanEmail.replace(/@.*/, ""))
      );
      if (matched) {
        user = {
          id: matched.id,
          name: matched.full_name,
          email: cleanEmail,
          role: matched.role || "member",
        };
      }
    }

    const validPasswords = [
      process.env.AUTH_PASSWORD,
      "keluarga123",
      "password123",
      "admin123",
    ].filter(Boolean);

    const isPasswordValid =
      validPasswords.includes(password.trim()) ||
      password.trim() === "keluarga" ||
      password.trim().length >= 6;

    if (!user || !isPasswordValid) {
      return NextResponse.json(
        {
          error:
            "Email atau kata sandi tidak cocok. Gunakan tombol akses cepat profil atau kata sandi: keluarga123",
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
