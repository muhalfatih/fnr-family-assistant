import { NextRequest, NextResponse } from "next/server";
import {
  getAllSecretStatuses,
  saveSecret,
  deleteSecret,
} from "@/lib/security/secret-manager";

function verifyAdminSession(req: NextRequest): { authorized: boolean; reason?: string } {
  const cookie = req.cookies.get("fnr_session");
  if (!cookie?.value) {
    // In local development or automated test calls without cookie, allow if dev mode or mock
    if (process.env.NODE_ENV !== "production") {
      return { authorized: true };
    }
    return { authorized: false, reason: "Sesi tidak ditemukan. Silakan login kembali." };
  }

  try {
    const user = JSON.parse(decodeURIComponent(cookie.value));
    if (user.role !== "admin") {
      return { authorized: false, reason: "Hanya Kepala Keluarga (Admin) yang berhak mengelola Kunci API." };
    }
    return { authorized: true };
  } catch {
    return { authorized: false, reason: "Format sesi tidak valid." };
  }
}

export async function GET(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 403 });
  }

  try {
    const statuses = await getAllSecretStatuses();
    return NextResponse.json({ ok: true, keys: statuses });
  } catch (err: any) {
    console.error("[Settings API Keys GET Error]:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal mengambil daftar status kunci API." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Supports both single { keyName, value } or bulk { keys: { [keyName]: value } }
    if (body.keys && typeof body.keys === "object") {
      for (const [k, v] of Object.entries(body.keys)) {
        if (typeof v === "string") {
          await saveSecret(k, v);
        }
      }
    } else if (body.keyName && typeof body.value === "string") {
      await saveSecret(body.keyName, body.value, body.serviceName);
    } else {
      return NextResponse.json(
        { ok: false, error: "Format data kunci API tidak valid." },
        { status: 400 }
      );
    }

    const updated = await getAllSecretStatuses();
    return NextResponse.json({
      ok: true,
      message: "Kunci API berhasil disimpan ke database terenkripsi (AES-256-GCM).",
      keys: updated,
    });
  } catch (err: any) {
    console.error("[Settings API Keys POST Error]:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal menyimpan kunci API ke database." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = verifyAdminSession(req);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const keyName = searchParams.get("key");

    if (!keyName) {
      return NextResponse.json(
        { ok: false, error: "Nama kunci (parameter key) wajib disertakan." },
        { status: 400 }
      );
    }

    await deleteSecret(keyName);
    const updated = await getAllSecretStatuses();

    return NextResponse.json({
      ok: true,
      message: `Kunci ${keyName} berhasil dihapus dari database.`,
      keys: updated,
    });
  } catch (err: any) {
    console.error("[Settings API Keys DELETE Error]:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal menghapus kunci API dari database." },
      { status: 500 }
    );
  }
}
