import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getGoogleAuthClient } from "@/lib/google/auth";
import { google } from "googleapis";

export interface ServiceDiagnosticResult {
  id: "gemini" | "telegram" | "supabase" | "google_cloud";
  name: string;
  category: string;
  status: "connected" | "missing_config" | "error";
  message: string;
  latencyMs?: number;
  details?: Record<string, any>;
}

export async function GET() {
  const results: ServiceDiagnosticResult[] = [];

  // 1. Check Google Gemini AI
  const geminiStart = Date.now();
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    results.push({
      id: "gemini",
      name: "Google Gemini AI (OCR & Parser)",
      category: "Artificial Intelligence",
      status: "missing_config",
      message: "GEMINI_API_KEY belum diisi pada .env.local",
    });
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Balas dengan 1 kata: OK",
      });
      const latency = Date.now() - geminiStart;
      if (response && response.text) {
        results.push({
          id: "gemini",
          name: "Google Gemini AI (OCR & Parser)",
          category: "Artificial Intelligence",
          status: "connected",
          message: "Model Gemini 2.5 Flash siap memproses struk & voice note.",
          latencyMs: latency,
          details: {
            model: "gemini-2.5-flash",
            keyPrefix: `${geminiApiKey.substring(0, 6)}...`,
          },
        });
      } else {
        throw new Error("Respon kosong dari Gemini API");
      }
    } catch (err: any) {
      results.push({
        id: "gemini",
        name: "Google Gemini AI (OCR & Parser)",
        category: "Artificial Intelligence",
        status: "error",
        message: err.message || "Gagal menghubungi Gemini API",
        latencyMs: Date.now() - geminiStart,
      });
    }
  }

  // 2. Check Telegram Bot API
  const telegramStart = Date.now();
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    results.push({
      id: "telegram",
      name: "Telegram Bot API",
      category: "Chat & Notification",
      status: "missing_config",
      message: "TELEGRAM_BOT_TOKEN belum diatur pada .env.local",
    });
  } else {
    try {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
        cache: "no-store",
      });
      const tgData = await tgRes.json();
      const latency = Date.now() - telegramStart;

      if (tgData.ok && tgData.result) {
        results.push({
          id: "telegram",
          name: "Telegram Bot API",
          category: "Chat & Notification",
          status: "connected",
          message: `Bot aktif: @${tgData.result.username} (${tgData.result.first_name})`,
          latencyMs: latency,
          details: {
            username: `@${tgData.result.username}`,
            botId: tgData.result.id,
            canJoinGroups: tgData.result.can_join_groups,
          },
        });
      } else {
        throw new Error(tgData.description || "Token bot Telegram tidak valid");
      }
    } catch (err: any) {
      results.push({
        id: "telegram",
        name: "Telegram Bot API",
        category: "Chat & Notification",
        status: "error",
        message: err.message || "Gagal menghubungi Telegram Bot API",
        latencyMs: Date.now() - telegramStart,
      });
    }
  }

  // 3. Check Supabase Database
  const supabaseStart = Date.now();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
    results.push({
      id: "supabase",
      name: "Supabase PostgreSQL Database",
      category: "Cloud Database",
      status: "missing_config",
      message: "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi",
    });
  } else {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      });
      const latency = Date.now() - supabaseStart;

      if (res.ok || res.status === 200 || res.status === 404) {
        results.push({
          id: "supabase",
          name: "Supabase PostgreSQL Database",
          category: "Cloud Database",
          status: "connected",
          message: "Koneksi REST API Supabase terhubung dengan baik.",
          latencyMs: latency,
          details: {
            url: supabaseUrl,
          },
        });
      } else {
        throw new Error(`HTTP Error status ${res.status}: ${res.statusText}`);
      }
    } catch (err: any) {
      results.push({
        id: "supabase",
        name: "Supabase PostgreSQL Database",
        category: "Cloud Database",
        status: "error",
        message: err.message || "Gagal menghubungi Supabase Database",
        latencyMs: Date.now() - supabaseStart,
      });
    }
  }

  // 4. Check Google Cloud Service Account (Sheets & Drive)
  const googleStart = Date.now();
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const driveFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const sheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!serviceEmail || !privateKey) {
    results.push({
      id: "google_cloud",
      name: "Google Cloud (Drive & Sheets)",
      category: "Cloud Storage & Backup",
      status: "missing_config",
      message: "GOOGLE_SERVICE_ACCOUNT_EMAIL atau PRIVATE_KEY belum diatur",
    });
  } else {
    try {
      const auth = getGoogleAuthClient();
      if (!auth) throw new Error("Gagal menginisialisasi Google JWT Auth");

      await auth.getAccessToken();
      const latency = Date.now() - googleStart;

      let sheetTitle = "Tersambung";
      if (sheetId) {
        try {
          const sheets = google.sheets({ version: "v4", auth });
          const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
          sheetTitle = meta.data.properties?.title || sheetTitle;
        } catch (e: any) {
          sheetTitle = `Sheet ID terdaftar (${e.message || "cek izin akses email bot"})`;
        }
      }

      results.push({
        id: "google_cloud",
        name: "Google Cloud (Drive & Sheets)",
        category: "Cloud Storage & Backup",
        status: "connected",
        message: "Autentikasi Service Account Google Cloud berhasil diverifikasi.",
        latencyMs: latency,
        details: {
          clientEmail: serviceEmail,
          spreadsheet: sheetId ? `ID: ${sheetId.substring(0, 8)}... (${sheetTitle})` : "Belum diisi",
          driveFolder: driveFolderId ? `ID: ${driveFolderId.substring(0, 8)}...` : "Belum diisi",
        },
      });
    } catch (err: any) {
      results.push({
        id: "google_cloud",
        name: "Google Cloud (Drive & Sheets)",
        category: "Cloud Storage & Backup",
        status: "error",
        message: err.message || "Gagal melakukan autentikasi Google Service Account",
        latencyMs: Date.now() - googleStart,
      });
    }
  }

  const allConnected = results.every((r) => r.status === "connected");
  const hasMissing = results.some((r) => r.status === "missing_config");

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    overallStatus: allConnected ? "healthy" : hasMissing ? "needs_config" : "degraded",
    services: results,
  });
}
