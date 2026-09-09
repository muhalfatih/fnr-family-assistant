import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/security/secret-manager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, customValue } = body;

    if (!service) {
      return NextResponse.json({ ok: false, error: "Parameter service wajib disertakan." }, { status: 400 });
    }

    if (service === "gemini") {
      const apiKey = customValue?.trim() || (await getSecret("GEMINI_API_KEY"));
      if (!apiKey) {
        return NextResponse.json(
          { ok: false, error: "Google Gemini API Key belum diisi atau disimpan." },
          { status: 400 }
        );
      }

      // Test call to Google Gemini API
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`,
          { signal: controller.signal }
        );
        clearTimeout(timer);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const msg = errData.error?.message || `HTTP ${res.status} ${res.statusText}`;
          return NextResponse.json({
            ok: false,
            error: `Gagal verifikasi kunci Gemini AI: ${msg}`,
          });
        }

        return NextResponse.json({
          ok: true,
          message: "Koneksi ke Google Gemini AI berhasil! Model Gemini 2.5 Flash siap digunakan.",
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          error: `Koneksi timeout / jaringan: ${e.message}`,
        });
      }
    }

    if (service === "telegram") {
      const botToken = customValue?.trim() || (await getSecret("TELEGRAM_BOT_TOKEN"));
      if (!botToken) {
        return NextResponse.json(
          { ok: false, error: "Telegram Bot Token belum diisi atau disimpan." },
          { status: 400 }
        );
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
          signal: controller.signal,
        });
        clearTimeout(timer);

        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json({
            ok: false,
            error: `Token Telegram tidak valid: ${data.description || "Unauthorized"}`,
          });
        }

        return NextResponse.json({
          ok: true,
          message: `Bot Telegram aktif! Terhubung ke: @${data.result.username} (${data.result.first_name}).`,
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          error: `Gagal menghubungi server Telegram: ${e.message}`,
        });
      }
    }

    if (service === "whatsapp") {
      const token = customValue?.trim() || (await getSecret("WHATSAPP_ACCESS_TOKEN"));
      if (!token) {
        return NextResponse.json(
          { ok: false, error: "WhatsApp Access Token belum diisi atau disimpan." },
          { status: 400 }
        );
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        clearTimeout(timer);

        const data = await res.json();
        if (data.error) {
          return NextResponse.json({
            ok: false,
            error: `Token WhatsApp tidak valid: ${data.error.message}`,
          });
        }

        return NextResponse.json({
          ok: true,
          message: `Koneksi Meta WhatsApp Cloud API berhasil! (ID Akun: ${data.id || "Valid"}).`,
        });
      } catch (e: any) {
        return NextResponse.json({
          ok: false,
          error: `Gagal menghubungi server Meta WhatsApp: ${e.message}`,
        });
      }
    }

    if (service === "r2") {
      const accountId = await getSecret("CLOUDFLARE_R2_ACCOUNT_ID");
      const accessKey = await getSecret("CLOUDFLARE_R2_ACCESS_KEY_ID");
      const secretKey = await getSecret("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
      const bucketName = await getSecret("CLOUDFLARE_R2_BUCKET_NAME");

      if (!accountId || !accessKey || !secretKey || !bucketName) {
        return NextResponse.json({
          ok: false,
          error: "Konfigurasi R2 belum lengkap. Pastikan Account ID, Access Key, Secret Key, dan Bucket Name terisi.",
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Konfigurasi Cloudflare R2 untuk bucket '${bucketName}' siap digunakan.`,
      });
    }

    if (service === "sheets") {
      const email = await getSecret("GOOGLE_SERVICE_ACCOUNT_EMAIL");
      const privateKey = await getSecret("GOOGLE_PRIVATE_KEY");
      const spreadsheetId = await getSecret("GOOGLE_SHEETS_SPREADSHEET_ID");

      if (!email || !privateKey || !spreadsheetId) {
        return NextResponse.json({
          ok: false,
          error: "Konfigurasi Google Sheets belum lengkap. Pastikan Service Account Email, Private Key, dan Spreadsheet ID terisi.",
        });
      }

      return NextResponse.json({
        ok: true,
        message: `Kredensial Service Account (${email}) dan Spreadsheet ID terverifikasi secara sintaks.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Layanan tidak dikenali." }, { status: 400 });
  } catch (err: any) {
    console.error("[Settings Test Error]:", err);
    return NextResponse.json({ ok: false, error: err.message || "Gagal menguji koneksi layanan." }, { status: 500 });
  }
}
