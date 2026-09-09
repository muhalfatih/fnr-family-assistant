import { getSecret } from "@/lib/security/secret-manager";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export function isTelegramConfigured(): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  if (
    token.startsWith("123456789:ABCdefGh") ||
    token === "your-bot-token" ||
    token.includes("...")
  ) {
    return false;
  }
  return true;
}

export async function getResolvedBotToken(): Promise<string | null> {
  const token = (await getSecret("TELEGRAM_BOT_TOKEN")) || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  if (
    token.startsWith("123456789:ABCdefGh") ||
    token === "your-bot-token" ||
    token.includes("...")
  ) {
    return null;
  }
  return token;
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
  return token;
}

/**
 * Robust fetch wrapper with timeout and simulation fallback
 */
async function safeTelegramPost(endpoint: string, payload: any, timeoutMs = 3000): Promise<any> {
  const token = await getResolvedBotToken();
  if (!token) {
    return {
      ok: true,
      simulated: true,
      result: {
        message_id: Math.floor(Math.random() * 100000),
        chat: { id: payload.chat_id || 0 },
        text: payload.text || "",
      },
    };
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${endpoint}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);
    return await res.json();
  } catch (err: any) {
    console.warn(`[Telegram API] Call to ${endpoint} failed (${err.message}). Falling back to simulation response.`);
    return {
      ok: true,
      simulated: true,
      result: {
        message_id: Math.floor(Math.random() * 100000),
        chat: { id: payload.chat_id || 0 },
        text: payload.text || "",
      },
    };
  }
}

/**
 * Send text message with optional Markdown / Inline Keyboard
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: any,
  parseMode: "Markdown" | "HTML" = "Markdown"
): Promise<any> {
  const payload: any = {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode,
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  return await safeTelegramPost("sendMessage", payload);
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
  const payload: any = {
    chat_id: chatId,
    message_id: messageId,
    text: text,
    parse_mode: "Markdown",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  return await safeTelegramPost("editMessageText", payload);
}

/**
 * Acknowledge Telegram callback query
 */
export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<any> {
  return await safeTelegramPost("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text: text || "Selesai",
  });
}

/**
 * Download file binary from Telegram Servers
 */
export async function downloadTelegramFile(fileId: string): Promise<{
  buffer: Buffer;
  mimeType: string;
  fileName: string;
} | null> {
  const token = await getResolvedBotToken();
  if (!token) {
    // Sediakan mock buffer untuk pengujian offline / demo
    return {
      buffer: Buffer.from("mock_receipt_image_data"),
      mimeType: "image/jpeg",
      fileName: `mock_receipt_${fileId}.jpg`,
    };
  }

  try {
    // 1. Get file path
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    const fileRes = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getFile?file_id=${fileId}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    const fileData = await fileRes.json();

    if (!fileData.ok || !fileData.result?.file_path) {
      console.error("Failed to get Telegram file info:", fileData);
      return null;
    }

    const filePath = fileData.result.file_path;
    const downloadUrl = `${TELEGRAM_API_BASE}/file/bot${token}/${filePath}`;

    // 2. Fetch binary
    const downloadController = new AbortController();
    const dlTimer = setTimeout(() => downloadController.abort(), 5000);
    const downloadRes = await fetch(downloadUrl, { signal: downloadController.signal });
    clearTimeout(dlTimer);
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

/**
 * Send chat action (e.g. 'typing', 'upload_photo', 'record_voice')
 * Displays 'typing...' or loading status in the Telegram chat header
 */
export async function sendTelegramChatAction(
  chatId: number | string,
  action: "typing" | "upload_photo" | "record_voice" | "upload_document" = "typing"
): Promise<any> {
  return await safeTelegramPost("sendChatAction", {
    chat_id: chatId,
    action: action,
  });
}

/**
 * Delete message from chat
 */
export async function deleteTelegramMessage(
  chatId: number | string,
  messageId: number
): Promise<any> {
  return await safeTelegramPost("deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * Keeps Telegram chat action ('typing', 'upload_photo', etc.) continuously
 * pulsing in the chat header every 4 seconds until the async operation completes.
 */
export async function withContinuousChatAction<T>(
  chatId: number | string,
  action: "typing" | "upload_photo" | "record_voice" | "upload_document",
  operation: () => Promise<T>
): Promise<T> {
  // Fire first action immediately
  sendTelegramChatAction(chatId, action).catch(() => {});

  // Pulse every 4 seconds (Telegram action timeout is 5s)
  const interval = setInterval(() => {
    sendTelegramChatAction(chatId, action).catch(() => {});
  }, 4000);

  try {
    return await operation();
  } finally {
    clearInterval(interval);
  }
}

/**
 * Get Telegram Chat profile details (username, first_name, last_name, etc.)
 */
export async function getTelegramChat(chatId: number | string): Promise<{
  ok: boolean;
  result?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    type?: string;
  };
  description?: string;
  simulated?: boolean;
}> {
  const token = await getResolvedBotToken();
  if (!token) {
    const mockChatId = String(chatId).trim();
    if (mockChatId === "123456789") {
      return {
        ok: true,
        simulated: true,
        result: {
          id: 123456789,
          username: "muhalfatih",
          first_name: "Fatih",
          type: "private",
        },
      };
    }
    if (mockChatId === "987654321") {
      return {
        ok: true,
        simulated: true,
        result: {
          id: 987654321,
          username: "ratnasari",
          first_name: "Ratna",
          type: "private",
        },
      };
    }
    return {
      ok: true,
      simulated: true,
      result: {
        id: Number(chatId) || 0,
        username: `user_${chatId}`,
        first_name: "Pengguna Telegram",
        type: "private",
      },
    };
  }

  return await safeTelegramPost("getChat", { chat_id: chatId });
}
