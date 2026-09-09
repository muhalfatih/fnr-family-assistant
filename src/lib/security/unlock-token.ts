import crypto from "crypto";

const UNLOCK_SECRET =
  process.env.ENCRYPTION_MASTER_KEY ||
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  "fnr-family-keys-unlock-secret-token-2026";

export const UNLOCK_COOKIE_NAME = "fnr_keys_unlocked";
export const UNLOCK_TTL_SECONDS = 300; // 5 menit

export interface UnlockTokenPayload {
  userId: string;
  role: string;
  expiresAt: number;
}

/**
 * Creates a tamper-proof HMAC-SHA256 signed unlock token
 */
export function createUnlockToken(
  userId: string,
  role: string,
  ttlSeconds: number = UNLOCK_TTL_SECONDS
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  const payload: UnlockTokenPayload = { userId, role, expiresAt };

  const dataStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", UNLOCK_SECRET)
    .update(dataStr)
    .digest("base64url");

  return {
    token: `${dataStr}.${signature}`,
    expiresAt,
  };
}

/**
 * Validates a signed unlock token and checks expiration
 */
export function verifyUnlockToken(token?: string | null): {
  valid: boolean;
  payload?: UnlockTokenPayload;
  remainingSeconds?: number;
} {
  if (!token || !token.includes(".")) {
    return { valid: false };
  }

  try {
    const [dataStr, signature] = token.split(".");
    if (!dataStr || !signature) {
      return { valid: false };
    }

    const expectedSig = crypto
      .createHmac("sha256", UNLOCK_SECRET)
      .update(dataStr)
      .digest("base64url");

    if (signature !== expectedSig) {
      return { valid: false };
    }

    const payload: UnlockTokenPayload = JSON.parse(
      Buffer.from(dataStr, "base64url").toString("utf8")
    );

    const now = Date.now();
    if (payload.expiresAt <= now) {
      return { valid: false };
    }

    const remainingSeconds = Math.max(0, Math.floor((payload.expiresAt - now) / 1000));
    return { valid: true, payload, remainingSeconds };
  } catch {
    return { valid: false };
  }
}
