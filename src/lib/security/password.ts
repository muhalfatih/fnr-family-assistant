import crypto from "crypto";

const ITERATIONS = 100000;
const KEY_LEN = 64;
const DIGEST = "sha256";

/**
 * Hash a password using PBKDF2 with a secure 16-byte random salt.
 * Stored string format: `saltHex:derivedKeyHex`
 */
export function hashPassword(password: string): string {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const cleanPass = password.trim();
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.pbkdf2Sync(cleanPass, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plain-text password against a stored PBKDF2 hash using constant-time comparison
 * to protect against timing attacks.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password || !storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }

  const [salt, derivedKey] = storedHash.split(":");
  if (!salt || !derivedKey) {
    return false;
  }

  try {
    const cleanPass = password.trim();
    const computed = crypto.pbkdf2Sync(cleanPass, salt, ITERATIONS, KEY_LEN, DIGEST);
    const expected = Buffer.from(derivedKey, "hex");

    if (computed.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
