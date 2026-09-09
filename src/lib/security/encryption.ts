import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits authentication tag

/**
 * Derives a consistent 32-byte key from available environment secrets
 */
function getMasterKey(): Buffer {
  const seed =
    process.env.ENCRYPTION_MASTER_KEY ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.AUTH_SECRET ||
    "fnr-family-assistant-secure-master-encryption-key-2026";

  // Hash with SHA-256 to ensure exact 32-byte (256-bit) key
  return crypto.createHash("sha256").update(seed).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns serialized format: `${ivHex}:${tagHex}:${cipherHex}`
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an encrypted string in `${ivHex}:${tagHex}:${cipherHex}` format
 * Returns null if decryption fails or authentication tag does not match
 */
export function decryptSecret(encryptedPayload: string): string | null {
  if (!encryptedPayload) return null;

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");
    const key = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(cipherHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("[Encryption Error] Failed to decrypt secret:", err);
    return null;
  }
}

/**
 * Generates a safe masked version of a secret for UI display (e.g. AIzaSy...****...88b)
 */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  const clean = secret.trim();
  if (clean.length <= 8) {
    return "••••••••";
  }
  const prefix = clean.substring(0, 4);
  const suffix = clean.substring(clean.length - 4);
  return `${prefix}••••••••${suffix}`;
}
