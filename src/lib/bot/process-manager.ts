import { ActiveProcessInfo, ChatActivityLog, LogStatus } from "@/lib/types/database";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";

interface RegisteredProcess {
  info: ActiveProcessInfo;
  abortController: AbortController;
  timeoutTimer: NodeJS.Timeout;
  loadingMessageId?: number | null;
  onCancel?: (reason: string) => Promise<void> | void;
}

// Global active process map attached to globalThis to persist across Next.js API re-evaluations
const globalForBot = globalThis as unknown as {
  activeBotProcesses?: Map<string, RegisteredProcess>;
  inMemoryLogs?: ChatActivityLog[];
};

export const activeProcesses = globalForBot.activeBotProcesses || new Map<string, RegisteredProcess>();
globalForBot.activeBotProcesses = activeProcesses;

export const inMemoryLogs: ChatActivityLog[] = globalForBot.inMemoryLogs || [];
globalForBot.inMemoryLogs = inMemoryLogs;

const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds strict timeout

/**
 * Register a new bot task in memory and start a 15-second timeout safeguard
 */
export function registerBotProcess(
  taskId: string,
  info: Omit<ActiveProcessInfo, "taskId" | "startTime" | "status">,
  options?: {
    timeoutMs?: number;
    loadingMessageId?: number | null;
    onTimeout?: () => Promise<void> | void;
    onCancel?: (reason: string) => Promise<void> | void;
  }
): {
  taskId: string;
  abortController: AbortController;
  signal: AbortSignal;
} {
  const abortController = new AbortController();
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  const processInfo: ActiveProcessInfo = {
    taskId,
    ...info,
    startTime: Date.now(),
    status: "running",
  };

  // Set 15s timeout
  const timeoutTimer = setTimeout(async () => {
    console.warn(`[ProcessManager] Task ${taskId} timed out after ${timeoutMs}ms! Aborting.`);
    abortController.abort("TIMEOUT");
    if (options?.onTimeout) {
      try {
        await options.onTimeout();
      } catch (err) {
        console.error("Error in onTimeout callback:", err);
      }
    }
    completeBotProcess(taskId, "timeout", "Batas waktu respon AI melebihi 15 detik (High Demand / Timeout)");
  }, timeoutMs);

  activeProcesses.set(taskId, {
    info: processInfo,
    abortController,
    timeoutTimer,
    loadingMessageId: options?.loadingMessageId,
    onCancel: options?.onCancel,
  });

  // Also record initial log in memory
  recordChatLog({
    id: taskId,
    channel: info.channel,
    chat_id: String(info.chatId),
    sender_name: info.senderName,
    input_type: info.inputType,
    raw_prompt: info.rawPrompt,
    status: "processing",
    created_at: new Date().toISOString(),
  });

  return { taskId, abortController, signal: abortController.signal };
}

/**
 * Update loading message ID for an active process
 */
export function updateProcessLoadingMessage(taskId: string, messageId?: number | null) {
  const p = activeProcesses.get(taskId);
  if (p) {
    p.loadingMessageId = messageId || null;
  }
}

/**
 * Cancel/Kill a running bot task immediately
 */
export async function cancelBotProcess(taskId: string, reason = "Dibatalkan oleh pengguna"): Promise<boolean> {
  const p = activeProcesses.get(taskId);
  if (!p) {
    return false;
  }

  p.info.status = "cancelling";
  clearTimeout(p.timeoutTimer);
  p.abortController.abort(reason);

  if (p.onCancel) {
    try {
      await p.onCancel(reason);
    } catch (e) {
      console.error("Error in onCancel callback:", e);
    }
  }

  completeBotProcess(taskId, "cancelled", reason);
  return true;
}

/**
 * Mark a process as completed (success, failed, timeout, cancelled) and persist log
 */
export async function completeBotProcess(
  taskId: string,
  status: LogStatus,
  errorMessage?: string,
  extra?: {
    latencyMs?: number;
    aiModel?: string;
    parsedMetadata?: Record<string, any>;
    transactionId?: string;
  }
) {
  const p = activeProcesses.get(taskId);
  if (p) {
    clearTimeout(p.timeoutTimer);
    activeProcesses.delete(taskId);
  }

  const completedAt = new Date().toISOString();
  const latency = extra?.latencyMs || (p ? Date.now() - p.info.startTime : undefined);

  // Update in-memory log
  const logIndex = inMemoryLogs.findIndex((l) => l.id === taskId);
  if (logIndex !== -1) {
    inMemoryLogs[logIndex] = {
      ...inMemoryLogs[logIndex],
      status,
      error_message: errorMessage || inMemoryLogs[logIndex].error_message,
      completed_at: completedAt,
      latency_ms: latency || inMemoryLogs[logIndex].latency_ms,
      ai_model: extra?.aiModel || inMemoryLogs[logIndex].ai_model || "gemini-3.5-flash-lite",
      parsed_metadata: extra?.parsedMetadata || inMemoryLogs[logIndex].parsed_metadata,
      transaction_id: extra?.transactionId || inMemoryLogs[logIndex].transaction_id,
    };
  }

  // Attempt async sync to Supabase (supports both chat_activity_logs and bot_logs tables)
  try {
    const logItem = inMemoryLogs.find((l) => l.id === taskId);
    if (logItem) {
      // 1. Try upserting to chat_activity_logs
      const { error: calErr } = await supabaseAdmin.from("chat_activity_logs").upsert(
        {
          id: logItem.id,
          family_id: logItem.family_id || null,
          channel: logItem.channel,
          chat_id: logItem.chat_id,
          sender_name: logItem.sender_name,
          input_type: logItem.input_type,
          raw_prompt: logItem.raw_prompt,
          status: logItem.status,
          error_message: logItem.error_message || null,
          ai_model: logItem.ai_model || "gemini-3.5-flash-lite",
          latency_ms: logItem.latency_ms || null,
          parsed_metadata: logItem.parsed_metadata || {},
          transaction_id: logItem.transaction_id || null,
          created_at: logItem.created_at,
          completed_at: logItem.completed_at,
        },
        { onConflict: "id" }
      );

      // 2. If chat_activity_logs isn't available or errored, try saving to bot_logs
      if (calErr) {
        await supabaseAdmin.from("bot_logs").insert({
          channel: logItem.channel,
          sender_id: logItem.chat_id || logItem.sender_name,
          message_type: logItem.input_type === "command" ? "text" : logItem.input_type,
          raw_content: logItem.raw_prompt,
          ai_response: {
            status: logItem.status,
            ai_model: logItem.ai_model,
            latency_ms: logItem.latency_ms,
            error_message: logItem.error_message,
            metadata: logItem.parsed_metadata,
            transaction_id: logItem.transaction_id,
          },
          status: logItem.status === "failed" ? "failed" : "success",
          created_at: logItem.created_at,
        });
      }
    }
  } catch (err) {
    // Non-blocking fallback to in-memory logs
  }
}

/**
 * Record a new chat log entry
 */
export function recordChatLog(log: ChatActivityLog) {
  const existing = inMemoryLogs.findIndex((l) => l.id === log.id);
  if (existing !== -1) {
    inMemoryLogs[existing] = log;
  } else {
    inMemoryLogs.unshift(log);
  }

  // Keep last 100 in-memory logs
  if (inMemoryLogs.length > 100) {
    inMemoryLogs.length = 100;
  }
}

/**
 * Get all active running bot processes
 */
export function getActiveBotProcesses(): ActiveProcessInfo[] {
  const list: ActiveProcessInfo[] = [];
  activeProcesses.forEach((p) => {
    list.push({ ...p.info });
  });
  return list;
}

// Helper to wrap external queries with a 2-second timeout to prevent UI hanging
async function withTimeout<T>(promise: PromiseLike<T>, timeoutMs = 2000): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
    ),
  ]);
}

/**
 * Detects whether any backend or bot credentials have been configured
 */
export function isAnyBotOrDbConfigured(): boolean {
  const hasSupabase = isSupabaseConfigured();
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const hasWhatsApp = Boolean(
    waToken &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    !waToken.includes("placeholder") &&
    waToken.length > 20
  );
  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const hasTelegram = Boolean(
    tgToken &&
    !tgToken.includes("placeholder") &&
    tgToken.length > 20
  );

  return hasSupabase || hasWhatsApp || hasTelegram;
}

/**
 * Get chat activity logs (combining memory, chat_activity_logs, and bot_logs from Supabase)
 * Falls back to mock data only when environment is not yet configured (clean local/staging).
 */
export async function getChatActivityLogs(
  limit = 50
): Promise<{ logs: ChatActivityLog[]; isMockMode: boolean }> {
  const configured = isAnyBotOrDbConfigured();

  // If environment has ANY configuration (Supabase, WhatsApp, or Telegram), use REAL logs
  if (configured) {
    const mergedMap = new Map<string, ChatActivityLog>();

    // 1. First add in-memory live logs (most up-to-date)
    inMemoryLogs.forEach((l) => mergedMap.set(l.id, l));

    // 2. Try fetching from Supabase chat_activity_logs with 2s timeout
    try {
      const result = await withTimeout<any>(
        supabaseAdmin
          .from("chat_activity_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit),
        2000
      );
      const dbLogs = result?.data;
      const dbErr = result?.error;

      if (!dbErr && dbLogs && dbLogs.length > 0) {
        dbLogs.forEach((l: any) => {
          if (!mergedMap.has(l.id)) {
            mergedMap.set(l.id, l);
          }
        });
      } else {
        // 3. Fallback query to bot_logs if chat_activity_logs is empty or doesn't exist
        const botResult = await withTimeout<any>(
          supabaseAdmin
            .from("bot_logs")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit),
          2000
        );
        const botLogs = botResult?.data;
        const botErr = botResult?.error;

        if (!botErr && botLogs && botLogs.length > 0) {
          botLogs.forEach((b: any) => {
            if (!mergedMap.has(b.id)) {
              mergedMap.set(b.id, {
                id: b.id,
                family_id: b.family_id,
                channel: (b.channel === "whatsapp" || b.channel === "telegram") ? b.channel : "whatsapp",
                chat_id: b.sender_id,
                sender_name: b.sender_id,
                input_type: (b.message_type as any) || "text",
                raw_prompt: b.raw_content,
                status: b.status === "failed" ? "failed" : "success",
                ai_model: b.ai_response?.ai_model || "gemini-3.5-flash-lite",
                latency_ms: b.ai_response?.latency_ms || null,
                error_message: b.ai_response?.error_message || null,
                parsed_metadata: b.ai_response?.metadata || {},
                transaction_id: b.ai_response?.transaction_id || null,
                created_at: b.created_at,
              });
            }
          });
        }
      }
    } catch (e) {
      // Non-blocking fallback to in-memory logs
    }

    // Sort chronologically descending and exclude legacy static dummy mock items (log-001..log-008)
    const realLogs = Array.from(mergedMap.values())
      .filter((l) => !/^log-00\d$/.test(l.id))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { logs: realLogs.slice(0, limit), isMockMode: false };
  }

  // Environment is NOT configured (Clean local or staging environment without env setup)
  // If inMemoryLogs has live items created during this session, use them
  if (inMemoryLogs.length > 0) {
    return { logs: inMemoryLogs.slice(0, limit), isMockMode: true };
  }

  // Otherwise return mockStore logs for staging/demo presentation
  return { logs: mockStore.getLogs().slice(0, limit), isMockMode: true };
}

/**
 * Delete a single chat log by ID
 */
export async function deleteChatActivityLog(id: string): Promise<boolean> {
  // 1. Remove from inMemoryLogs
  const memIdx = inMemoryLogs.findIndex((l) => l.id === id);
  if (memIdx !== -1) {
    inMemoryLogs.splice(memIdx, 1);
  }

  // 2. Remove from mockStore
  mockStore.deleteLog(id);

  // 3. Remove from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await Promise.allSettled([
        supabaseAdmin.from("chat_activity_logs").delete().eq("id", id),
        supabaseAdmin.from("bot_logs").delete().eq("id", id),
      ]);
    } catch (e) {
      console.warn("Failed to delete log from Supabase:", e);
    }
  }

  return true;
}

/**
 * Clear all chat logs
 */
export async function clearAllChatActivityLogs(): Promise<boolean> {
  // 1. Clear inMemoryLogs
  inMemoryLogs.length = 0;

  // 2. Clear mockStore
  mockStore.clearLogs();

  // 3. Clear from Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      await Promise.allSettled([
        supabaseAdmin.from("chat_activity_logs").delete().not("id", "is", null),
        supabaseAdmin.from("bot_logs").delete().not("id", "is", null),
      ]);
    } catch (e) {
      console.warn("Failed to clear logs from Supabase:", e);
    }
  }

  return true;
}
