import crypto from "crypto";
import { mockStore } from "@/lib/mock-data";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  telegramChatId?: number | null;
  whatsappNumber?: string | null;
}

export interface OtpRecord {
  id: string;
  channel: "whatsapp" | "telegram";
  identifier: string; // Normalized identifier
  targetDisplay: string;
  code: string; // 6-digit string
  magicToken: string; // Cryptographic url-safe token
  user: AuthenticatedUser;
  createdAt: number;
  expiresAt: number;
  lastSentAt: number;
  attempts: number;
}

export interface OtpChallengeToken {
  identifier: string;
  channel: "whatsapp" | "telegram";
  codeHash: string;
  magicToken: string;
  user: AuthenticatedUser;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 detik
const OTP_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.AUTH_SECRET || "fnr-family-otp-secret-key-2026";

// Use global singleton to survive hot-module reloading in Next.js development
const globalForOtp = globalThis as unknown as {
  otpStore?: Map<string, OtpRecord>;
  magicTokenIndex?: Map<string, string>; // magicToken -> identifier
};

if (!globalForOtp.otpStore) {
  globalForOtp.otpStore = new Map<string, OtpRecord>();
}
if (!globalForOtp.magicTokenIndex) {
  globalForOtp.magicTokenIndex = new Map<string, string>();
}

const otpStore = globalForOtp.otpStore;
const magicTokenIndex = globalForOtp.magicTokenIndex;

/**
 * Normalize phone numbers to standard Indonesian format (e.g. 6281234567890)
 * Handles +62, 62, 08, 8, spaces, dashes, and parentheses seamlessly
 */
export function normalizePhoneNumber(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.substring(1)}`;
  } else if (cleaned.startsWith("8")) {
    cleaned = `62${cleaned}`;
  }
  return cleaned;
}

/**
 * Creates an HMAC-signed stateless challenge token for reliable verification across Vercel serverless functions
 */
export function createSignedChallenge(record: OtpRecord): string {
  const payload: OtpChallengeToken = {
    identifier: record.identifier,
    channel: record.channel,
    codeHash: crypto.createHmac("sha256", OTP_SECRET).update(record.code).digest("hex"),
    magicToken: record.magicToken,
    user: record.user,
    expiresAt: record.expiresAt,
  };
  const jsonStr = JSON.stringify(payload);
  const base64Data = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto.createHmac("sha256", OTP_SECRET).update(base64Data).digest("base64url");
  return `${base64Data}.${signature}`;
}

/**
 * Verifies the stateless HMAC-signed challenge token from HTTP cookie
 */
export function verifySignedChallenge(tokenStr: string): { valid: boolean; payload?: OtpChallengeToken } {
  if (!tokenStr || !tokenStr.includes(".")) return { valid: false };
  const [base64Data, signature] = tokenStr.split(".");
  if (!base64Data || !signature) return { valid: false };

  const expectedSig = crypto.createHmac("sha256", OTP_SECRET).update(base64Data).digest("base64url");
  if (signature !== expectedSig) return { valid: false };

  try {
    const payload: OtpChallengeToken = JSON.parse(Buffer.from(base64Data, "base64url").toString("utf8"));
    if (Date.now() > payload.expiresAt) return { valid: false };
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Mask target for privacy display (e.g. +62 812-****-7890 or ID 123***789)
 */
export function maskTarget(identifier: string, channel: "whatsapp" | "telegram"): string {
  if (channel === "whatsapp") {
    const cleaned = normalizePhoneNumber(identifier);
    if (cleaned.length >= 10) {
      const prefix = cleaned.substring(0, 5);
      const suffix = cleaned.substring(cleaned.length - 4);
      return `+${prefix}****${suffix}`;
    }
    return `+${cleaned}`;
  } else {
    const clean = identifier.replace(/^@/, "").replace(/^id:?\s*/i, "").trim();
    if (/^\d+$/.test(clean)) {
      if (clean.length > 5) {
        return `ID ${clean.substring(0, 3)}***${clean.substring(clean.length - 2)}`;
      }
      return `ID ${clean}`;
    }
    if (clean.length > 4) {
      return `@${clean.substring(0, 2)}***${clean.substring(clean.length - 2)}`;
    }
    return clean;
  }
}

/**
 * Look up family member based on channel and identifier
 * Supports:
 * - WhatsApp: phone (+62, 62, 08, etc.)
 * - Telegram: numeric Chat ID, registered phone number, full name, or common family alias
 * Queries real database in Supabase first, falls back to mockStore
 */
export async function findMemberByIdentifier(
  channel: "whatsapp" | "telegram",
  identifier: string
): Promise<AuthenticatedUser | null> {
  const cleanInput = identifier.replace(/^@/, "").replace(/^id:?\s*/i, "").trim().toLowerCase();
  const digitsOnly = cleanInput.replace(/\D/g, "");
  const normalizedPhone = normalizePhoneNumber(identifier);

  // 1. Prioritize querying Supabase Cloud database
  if (isSupabaseConfigured()) {
    try {
      const { data: members, error } = await supabaseAdmin
        .from("family_members")
        .select("id, full_name, role, whatsapp_number, telegram_chat_id");

      if (error) {
        console.error("[Auth] Error fetching family_members from Supabase:", error);
      } else if (members && members.length > 0) {
        if (channel === "whatsapp") {
          for (const m of members) {
            if (m.whatsapp_number) {
              const normalizedMember = normalizePhoneNumber(m.whatsapp_number);
              if (normalizedMember === normalizedPhone) {
                return {
                  id: m.id,
                  name: m.full_name,
                  email: `${m.full_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@keluarga.hub`,
                  role: m.role || "member",
                  telegramChatId: m.telegram_chat_id ? Number(m.telegram_chat_id) : null,
                  whatsappNumber: m.whatsapp_number,
                };
              }
            }
          }
        } else if (channel === "telegram") {
          for (const m of members) {
            const chatIdStr = m.telegram_chat_id ? String(m.telegram_chat_id).trim() : "";
            const memberNameLower = m.full_name.toLowerCase();
            const memberPhone = m.whatsapp_number ? normalizePhoneNumber(m.whatsapp_number) : "";

            // A. Numeric Chat ID match
            const isChatIdMatch = chatIdStr && (chatIdStr === cleanInput || (digitsOnly && chatIdStr === digitsOnly));

            // B. Registered Phone number match (if user entered phone on Telegram tab)
            const isPhoneMatch = Boolean(normalizedPhone && memberPhone && normalizedPhone === memberPhone);

            // C. Name or Substring match
            const isNameMatch = memberNameLower === cleanInput || memberNameLower.includes(cleanInput);

            if (isChatIdMatch || isPhoneMatch || isNameMatch) {
              return {
                id: m.id,
                name: m.full_name,
                email: `${m.full_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@keluarga.hub`,
                role: m.role || "member",
                telegramChatId: m.telegram_chat_id ? Number(m.telegram_chat_id) : null,
                whatsappNumber: m.whatsapp_number,
              };
            }
          }
        }
      }
    } catch (err) {
      console.error("[Auth] Exception querying Supabase members:", err);
    }
  }

  // 2. Fallback to mockStore in development / demo mode
  const mockMembers = mockStore.getMembers();

  if (channel === "whatsapp") {
    for (const m of mockMembers) {
      if (m.whatsapp_number) {
        const normalizedMember = normalizePhoneNumber(m.whatsapp_number);
        if (normalizedMember === normalizedPhone) {
          return {
            id: m.id,
            name: m.full_name,
            email: m.id === "mem-001" ? "ayah@keluarga.hub" : m.id === "mem-002" ? "ibu@keluarga.hub" : `${m.id}@keluarga.hub`,
            role: m.role || "member",
            telegramChatId: m.telegram_chat_id ? Number(m.telegram_chat_id) : null,
            whatsappNumber: m.whatsapp_number,
          };
        }
      }
    }
  } else if (channel === "telegram") {
    for (const m of mockMembers) {
      const chatIdStr = m.telegram_chat_id ? String(m.telegram_chat_id) : "";
      const memberNameLower = m.full_name.toLowerCase();
      const memberPhone = m.whatsapp_number ? normalizePhoneNumber(m.whatsapp_number) : "";

      const isChatIdMatch = chatIdStr && (chatIdStr === cleanInput || (digitsOnly && chatIdStr === digitsOnly));
      const isPhoneMatch = Boolean(normalizedPhone && memberPhone && normalizedPhone === memberPhone);
      const isNameMatch =
        ((cleanInput === "ayah" || cleanInput === "fatih") && m.id === "mem-001") ||
        ((cleanInput === "ibu" || cleanInput === "bunda" || cleanInput === "rania") && m.id === "mem-002") ||
        ((cleanInput === "kakak" || cleanInput === "zaid") && m.id === "mem-003") ||
        ((cleanInput === "adik" || cleanInput === "maryam") && m.id === "mem-004") ||
        memberNameLower.includes(cleanInput);

      if (isChatIdMatch || isPhoneMatch || isNameMatch) {
        return {
          id: m.id,
          name: m.full_name,
          email: m.id === "mem-001" ? "ayah@keluarga.hub" : m.id === "mem-002" ? "ibu@keluarga.hub" : `${m.id}@keluarga.hub`,
          role: m.role || "member",
          telegramChatId: m.telegram_chat_id ? Number(m.telegram_chat_id) : null,
          whatsappNumber: m.whatsapp_number,
        };
      }
    }
  }

  return null;
}

/**
 * Generate 6-digit OTP code and random magic link token
 */
export function issueOtp(
  channel: "whatsapp" | "telegram",
  identifier: string,
  user: AuthenticatedUser
): {
  success: boolean;
  cooldownRemaining?: number;
  record?: OtpRecord;
  error?: string;
} {
  const normalizedKey = channel === "whatsapp" ? normalizePhoneNumber(identifier) : identifier.trim().toLowerCase();
  const now = Date.now();

  const existing = otpStore.get(normalizedKey);
  if (existing && existing.expiresAt > now) {
    const timeSinceLastSent = now - existing.lastSentAt;
    if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
      const cooldownRemaining = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
      return {
        success: false,
        cooldownRemaining,
        error: `Silakan tunggu ${cooldownRemaining} detik sebelum meminta kode baru.`,
      };
    }
  }

  // Generate cryptographically strong 6-digit code (e.g. 102938)
  const randomNum = crypto.randomInt(100000, 999999);
  const code = randomNum.toString();

  // Generate 32-char url-safe magic token
  const magicToken = crypto.randomBytes(24).toString("base64url");

  const record: OtpRecord = {
    id: `otp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    channel,
    identifier: normalizedKey,
    targetDisplay: maskTarget(identifier, channel),
    code,
    magicToken,
    user,
    createdAt: now,
    expiresAt: now + OTP_TTL_MS,
    lastSentAt: now,
    attempts: 0,
  };

  otpStore.set(normalizedKey, record);
  magicTokenIndex.set(magicToken, normalizedKey);

  // Bersihkan token kadaluwarsa secara berkala
  cleanupExpired();

  return { success: true, record };
}

/**
 * Verify 6-digit OTP code
 * Checks signed challenge cookie first (serverless proof), with in-memory fallback
 */
export function verifyOtpCode(
  channel: "whatsapp" | "telegram",
  identifier: string,
  inputCode: string,
  challengeCookieToken?: string
): { success: boolean; user?: AuthenticatedUser; error?: string } {
  const cleanInput = inputCode.trim().replace(/\D/g, "");
  const normalizedKey = channel === "whatsapp" ? normalizePhoneNumber(identifier) : identifier.trim().toLowerCase();

  // 1. Primary check: Stateless Signed Challenge Token (100% resilient on Vercel Serverless)
  if (challengeCookieToken) {
    const verified = verifySignedChallenge(challengeCookieToken);
    if (verified.valid && verified.payload) {
      const payload = verified.payload;
      const expectedHash = crypto.createHmac("sha256", OTP_SECRET).update(cleanInput).digest("hex");

      if (payload.identifier === normalizedKey && payload.channel === channel) {
        if (payload.codeHash === expectedHash) {
          // Success! Clean memory if present
          otpStore.delete(normalizedKey);
          magicTokenIndex.delete(payload.magicToken);
          return { success: true, user: payload.user };
        } else {
          return { success: false, error: "Kode verifikasi 6-digit salah. Silakan periksa kembali." };
        }
      }
    }
  }

  // 2. Secondary check: In-Memory Map (for localhost development or same container)
  const record = otpStore.get(normalizedKey);

  if (!record) {
    return {
      success: false,
      error: "Kode verifikasi tidak ditemukan atau telah kadaluwarsa. Silakan minta kode baru.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedKey);
    magicTokenIndex.delete(record.magicToken);
    return {
      success: false,
      error: "Kode verifikasi telah kadaluwarsa (lebih dari 5 menit). Silakan minta kode baru.",
    };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(normalizedKey);
    magicTokenIndex.delete(record.magicToken);
    return {
      success: false,
      error: "Terlalu banyak percobaan salah. Silakan minta kode verifikasi baru.",
    };
  }

  if (record.code !== cleanInput) {
    const remainingAttempts = 5 - record.attempts;
    return {
      success: false,
      error: `Kode verifikasi salah. Sisa kesempatan: ${remainingAttempts} kali.`,
    };
  }

  // Sukses, bersihkan record agar tidak bisa dipakai ulang
  const user = record.user;
  otpStore.delete(normalizedKey);
  magicTokenIndex.delete(record.magicToken);

  return { success: true, user };
}

/**
 * Verify Magic Link Token
 */
export function verifyMagicToken(
  token: string,
  challengeCookieToken?: string
): {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
} {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Tautan verifikasi tidak valid." };
  }

  // 1. Check stateless signed challenge token first
  if (challengeCookieToken) {
    const verified = verifySignedChallenge(challengeCookieToken);
    if (verified.valid && verified.payload && verified.payload.magicToken === token.trim()) {
      return { success: true, user: verified.payload.user };
    }
  }

  // 2. In-Memory fallback
  const normalizedKey = magicTokenIndex.get(token);
  if (!normalizedKey) {
    return {
      success: false,
      error: "Tautan login telah kadaluwarsa atau sudah digunakan.",
    };
  }

  const record = otpStore.get(normalizedKey);
  if (!record || record.magicToken !== token) {
    magicTokenIndex.delete(token);
    return {
      success: false,
      error: "Tautan login tidak valid.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedKey);
    magicTokenIndex.delete(token);
    return {
      success: false,
      error: "Tautan login telah kadaluwarsa (lebih dari 5 menit). Silakan minta link baru.",
    };
  }

  const user = record.user;
  otpStore.delete(normalizedKey);
  magicTokenIndex.delete(token);

  return { success: true, user };
}

function cleanupExpired() {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
      magicTokenIndex.delete(record.magicToken);
    }
  }
}
