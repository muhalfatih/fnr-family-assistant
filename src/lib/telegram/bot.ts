const TELEGRAM_API_BASE = "https://api.telegram.org";

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
  return token;
}

/**
 * Send text message with optional Markdown / Inline Keyboard
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: any
): Promise<any> {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/sendMessage`;

  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

/**
 * Edit existing message text and keyboard
 */
export async function editTelegramMessageText(
  chatId: number | string,
  messageId: number,
  text: string,
  replyMarkup?: any
): Promise<any> {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/editMessageText`;

  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: "Markdown",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await res.json();
}

/**
 * Acknowledge Telegram callback query
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<any> {
  const token = getBotToken();
  const url = `${TELEGRAM_API_BASE}/bot${token}/answerCallbackQuery`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || "Selesai",
    }),
  });

  return await res.json();
}

/**
 * Download file binary from Telegram Servers
 */
export async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const token = getBotToken();

  try {
    // 1. Get file path
    const fileRes = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${fileId}`);
    const fileData = await fileRes.json();

    if (!fileData.ok || !fileData.result?.file_path) {
      console.error("Failed to get Telegram file info:", fileData);
      return null;
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;

    // 2. Fetch binary
    const downloadRes = await fetch(downloadUrl);
    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension and mime type
    const ext = filePath.split(".").pop()?.toLowerCase() || "jpg";
    let mimeType = "image/jpeg";
    if (ext === "png") mimeType = "image/png";
    else if (ext === "oga" || ext === "ogg" || ext === "opus") mimeType = "audio/ogg";
    else if (ext === "pdf") mimeType = "application/pdf";

    const fileName = filePath.split("/").pop() || `tg_${fileId}.${ext}`;

    return { buffer, mimeType, fileName };
  } catch (err) {
    console.error("Error downloading file from Telegram:", err);
    return null;
  }
}
