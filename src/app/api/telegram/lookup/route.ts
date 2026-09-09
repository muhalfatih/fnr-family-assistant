import { NextRequest, NextResponse } from "next/server";
import { getTelegramChat } from "@/lib/telegram/bot";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawChatId = searchParams.get("chat_id")?.trim();

    if (!rawChatId) {
      return NextResponse.json(
        { ok: false, error: "Telegram Chat ID wajib diisi." },
        { status: 400 }
      );
    }

    const chatId = Number(rawChatId);
    if (isNaN(chatId) || chatId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Format Telegram Chat ID harus berupa angka positif." },
        { status: 400 }
      );
    }

    const tgRes = await getTelegramChat(chatId);

    if (!tgRes || !tgRes.ok || !tgRes.result) {
      const errMsg =
        tgRes?.description ||
        "Akun Telegram tidak ditemukan atau belum pernah mengirim pesan/start ke bot @fnr_assistant_bot.";
      return NextResponse.json({ ok: false, error: errMsg }, { status: 200 });
    }

    const result = tgRes.result;
    const username = result.username ? result.username.replace(/^@/, "").trim() : null;
    const displayName =
      [result.first_name, result.last_name].filter(Boolean).join(" ") ||
      result.title ||
      "Akun Telegram";

    return NextResponse.json({
      ok: true,
      chatId: result.id,
      username,
      hasUsername: Boolean(username),
      displayName,
      simulated: Boolean(tgRes.simulated),
    });
  } catch (err: any) {
    console.error("[Telegram Lookup Error]:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Gagal menghubungi server Telegram." },
      { status: 500 }
    );
  }
}
