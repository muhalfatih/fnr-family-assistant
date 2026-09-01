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

export const inMemoryLogs = globalForBot.inMemoryLogs || [...mockStore.getLogs()];
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

  // Attempt async sync to Supabase chat_activity_logs (gracefully ignores if table doesn't exist)
  try {
    const logItem = inMemoryLogs.find((l) => l.id === taskId);
    if (logItem) {
      await supabaseAdmin.from("chat_activity_logs").upsert(
        {
          id: logItem.id,
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

/**
 * Get chat activity logs (combining memory and Supabase)
 */
export async function getChatActivityLogs(limit = 50): Promise<ChatActivityLog[]> {
  try {
    const { data: dbLogs } = await supabaseAdmin
      .from("chat_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (dbLogs && dbLogs.length > 0) {
      // Merge memory logs (most up-to-date) with DB logs
      const mergedMap = new Map<string, ChatActivityLog>();
      dbLogs.forEach((l: any) => mergedMap.set(l.id, l));
      inMemoryLogs.forEach((l) => mergedMap.set(l.id, l));
      return Array.from(mergedMap.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    }
  } catch (e) {
    // Fallback to in-memory logs
  }

  return inMemoryLogs.slice(0, limit);
}
