import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";

// Global map to store processed webhook IDs across hot-reloads and serverless execution
const globalForIdempotency = globalThis as unknown as {
  processedWebhookKeys?: Map<string, number>;
};

const processedWebhookKeys =
  globalForIdempotency.processedWebhookKeys || new Map<string, number>();
globalForIdempotency.processedWebhookKeys = processedWebhookKeys;

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

/**
 * Checks if a webhook message key has already been processed or is currently in-flight.
 * If not seen, it registers the key with current timestamp.
 * Returns `true` if duplicate (should be dropped), `false` if first time (should be processed).
 */
export function isWebhookDuplicate(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  if (!key) return false;

  const now = Date.now();

  // Periodic cleanup of expired keys (keep memory bounded)
  if (processedWebhookKeys.size > 2000) {
    for (const [k, timestamp] of processedWebhookKeys.entries()) {
      if (now - timestamp > ttlMs) {
        processedWebhookKeys.delete(k);
      }
    }
  }

  const existingTimestamp = processedWebhookKeys.get(key);
  if (existingTimestamp && now - existingTimestamp < ttlMs) {
    console.warn(`[Idempotency] Duplicate webhook key detected and blocked: ${key}`);
    return true;
  }

  // Register key
  processedWebhookKeys.set(key, now);
  return false;
}

export interface DuplicateCheckParams {
  familyId: string;
  amount: number;
  type: string;
  merchant?: string | null;
  description?: string | null;
  windowMinutes?: number;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingTx?: any;
  minutesAgo?: number;
}

/**
 * Normalizes text to easily compare merchants/descriptions regardless of casing or punctuation
 */
function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if a transaction with the same amount, type, and merchant/description
 * was already recorded within the last N minutes (default: 5 minutes).
 */
export async function checkRecentDuplicateTransaction(
  params: DuplicateCheckParams
): Promise<DuplicateCheckResult> {
  const { familyId, amount, type, merchant, description, windowMinutes = 5 } = params;

  if (!familyId || !amount || amount <= 0) {
    return { isDuplicate: false };
  }

  const windowMs = windowMinutes * 60 * 1000;
  const cutoffIso = new Date(Date.now() - windowMs).toISOString();

  const candidateMerchant = normalizeText(merchant);
  const candidateDesc = normalizeText(description);

  // 1. Supabase Check
  if (isSupabaseConfigured()) {
    try {
      const { data: recentTxs, error } = await supabaseAdmin
        .from("transactions")
        .select("id, amount, description, type, created_at, parsed_metadata")
        .eq("family_id", familyId)
        .eq("type", type)
        .eq("amount", Math.round(amount))
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("[Idempotency] Supabase duplicate check query error:", error.message);
      } else if (recentTxs && recentTxs.length > 0) {
        for (const tx of recentTxs) {
          const existingDesc = normalizeText(tx.description);
          const existingMerchant = normalizeText(tx.parsed_metadata?.merchant);

          // Check for matching merchant or description
          let isMatch = false;

          if (candidateMerchant && existingMerchant && candidateMerchant === existingMerchant) {
            isMatch = true;
          } else if (candidateDesc && existingDesc && candidateDesc === existingDesc) {
            isMatch = true;
          } else if (
            (candidateMerchant && existingDesc.includes(candidateMerchant)) ||
            (candidateDesc && existingMerchant && candidateDesc.includes(existingMerchant))
          ) {
            isMatch = true;
          } else if (!candidateMerchant && !existingMerchant) {
            // Both without explicit merchant, but same amount and similar description prefix
            isMatch = true;
          }

          if (isMatch) {
            const createdAtMs = new Date(tx.created_at).getTime();
            const minutesAgo = Math.max(1, Math.round((Date.now() - createdAtMs) / (60 * 1000)));
            return {
              isDuplicate: true,
              existingTx: tx,
              minutesAgo,
            };
          }
        }
      }
    } catch (e) {
      console.error("[Idempotency] Exception in Supabase duplicate check:", e);
    }
  }

  // 2. Mock Store Check (Fallback)
  try {
    const mockTxs = mockStore.getTransactions() || [];
    const now = Date.now();

    for (const tx of mockTxs) {
      if (
        tx.family_id === familyId &&
        tx.type === type &&
        Math.round(tx.amount) === Math.round(amount)
      ) {
        const txTime = new Date(tx.created_at).getTime();
        if (now - txTime < windowMs) {
          const existingDesc = normalizeText(tx.description);
          const existingMerchant = normalizeText(tx.parsed_metadata?.merchant);

          let isMatch = false;
          if (candidateMerchant && existingMerchant && candidateMerchant === existingMerchant) {
            isMatch = true;
          } else if (candidateDesc && existingDesc && candidateDesc === existingDesc) {
            isMatch = true;
          } else if (!candidateMerchant && !existingMerchant) {
            isMatch = true;
          }

          if (isMatch) {
            const minutesAgo = Math.max(1, Math.round((now - txTime) / (60 * 1000)));
            return {
              isDuplicate: true,
              existingTx: tx,
              minutesAgo,
            };
          }
        }
      }
    }
  } catch (e) {
    console.error("[Idempotency] Exception in mockStore duplicate check:", e);
  }

  return { isDuplicate: false };
}
