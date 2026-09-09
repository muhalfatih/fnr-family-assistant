import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { mockStore } from "@/lib/mock-data";
import { encryptSecret, decryptSecret, maskSecret } from "./encryption";

export interface SecretDefinition {
  keyName: string;
  service: "gemini" | "telegram" | "whatsapp" | "r2" | "sheets";
  label: string;
  description: string;
  placeholder?: string;
  isSecret?: boolean; // false for public IDs/URLs, true for API keys/tokens
}

export const KNOWN_SECRETS: SecretDefinition[] = [
  // Gemini AI
  {
    keyName: "GEMINI_API_KEY",
    service: "gemini",
    label: "Google Gemini API Key",
    description: "Kunci API Google AI Studio untuk parser keuangan cerdas & OCR struk kasir.",
    placeholder: "AIzaSy...",
    isSecret: true,
  },

  // Telegram Bot
  {
    keyName: "TELEGRAM_BOT_TOKEN",
    service: "telegram",
    label: "Telegram Bot Token",
    description: "Token otentikasi bot Telegram yang diperoleh dari @BotFather.",
    placeholder: "1234567890:ABCdefGhI...",
    isSecret: true,
  },
  {
    keyName: "TELEGRAM_WEBHOOK_SECRET",
    service: "telegram",
    label: "Telegram Webhook Secret",
    description: "Kunci rahasia untuk memvalidasi permintaan webhook masuk dari server Telegram.",
    placeholder: "Secret token acak...",
    isSecret: true,
  },

  // WhatsApp Cloud API
  {
    keyName: "WHATSAPP_ACCESS_TOKEN",
    service: "whatsapp",
    label: "WhatsApp Access Token",
    description: "Meta Graph API System User / Permanent Token untuk mengirim pesan WA.",
    placeholder: "EAAG...",
    isSecret: true,
  },
  {
    keyName: "WHATSAPP_PHONE_NUMBER_ID",
    service: "whatsapp",
    label: "WhatsApp Phone Number ID",
    description: "ID nomor telepon terdaftar pada Meta WhatsApp Business Platform.",
    placeholder: "105938472910293",
    isSecret: false,
  },
  {
    keyName: "WHATSAPP_VERIFY_TOKEN",
    service: "whatsapp",
    label: "WhatsApp Webhook Verify Token",
    description: "Token string verifikasi handshake webhook Meta.",
    placeholder: "fnr_family_wa_secret",
    isSecret: true,
  },

  // Cloudflare R2
  {
    keyName: "CLOUDFLARE_R2_ACCOUNT_ID",
    service: "r2",
    label: "Cloudflare Account ID",
    description: "ID Akun Cloudflare pengguna untuk akses Object Storage R2.",
    placeholder: "a1b2c3d4e5f6...",
    isSecret: false,
  },
  {
    keyName: "CLOUDFLARE_R2_ACCESS_KEY_ID",
    service: "r2",
    label: "R2 Access Key ID",
    description: "Kredensial S3 API Access Key ID Cloudflare R2.",
    placeholder: "8f7e6d5c4b3a...",
    isSecret: true,
  },
  {
    keyName: "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    service: "r2",
    label: "R2 Secret Access Key",
    description: "Kredensial S3 API Secret Access Key Cloudflare R2.",
    placeholder: "9a8b7c6d5e4f...",
    isSecret: true,
  },
  {
    keyName: "CLOUDFLARE_R2_BUCKET_NAME",
    service: "r2",
    label: "R2 Bucket Name",
    description: "Nama bucket R2 tempat penyimpanan foto struk dan dokumen.",
    placeholder: "fnr-family-receipts",
    isSecret: false,
  },
  {
    keyName: "CLOUDFLARE_R2_PUBLIC_URL",
    service: "r2",
    label: "R2 Public URL / Custom Domain",
    description: "URL domain publik bucket (contoh: https://media.keluarga.com).",
    placeholder: "https://media.keluarga.com",
    isSecret: false,
  },

  // Google Sheets & Drive
  {
    keyName: "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    service: "sheets",
    label: "Google Service Account Email",
    description: "Alamat email service account Google Cloud untuk sinkronisasi Sheets & Drive.",
    placeholder: "service-account@project.iam.gserviceaccount.com",
    isSecret: false,
  },
  {
    keyName: "GOOGLE_PRIVATE_KEY",
    service: "sheets",
    label: "Google Private Key",
    description: "Private key RSA Service Account Google Cloud (format PEM).",
    placeholder: "-----BEGIN PRIVATE KEY-----\n...",
    isSecret: true,
  },
  {
    keyName: "GOOGLE_SHEETS_SPREADSHEET_ID",
    service: "sheets",
    label: "Google Spreadsheet ID",
    description: "ID berkas Google Spreadsheet untuk pencatatan otomatis transaksi.",
    placeholder: "1BxiMVs0XRX5nZy1QkPA...",
    isSecret: false,
  },
];

export interface SecretStatusInfo {
  keyName: string;
  service: string;
  label: string;
  description: string;
  source: "database" | "env" | "missing";
  maskedValue: string;
  isConfigured: boolean;
  isSecret: boolean;
  updatedAt?: string | null;
}

/**
 * Retrieves decrypted secret value by keyName:
 * 1. Database (system_api_keys) -> decrypted
 * 2. In-memory MockStore -> decrypted
 * 3. Environment variable (process.env) -> fallback
 */
export async function getSecret(keyName: string): Promise<string | null> {
  // 1. Check Supabase table
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("system_api_keys")
        .select("encrypted_value")
        .eq("key_name", keyName)
        .maybeSingle();

      if (!error && data?.encrypted_value) {
        const decrypted = decryptSecret(data.encrypted_value);
        if (decrypted) return decrypted;
      }
    } catch (err) {
      console.warn(`[SecretManager] Error reading DB secret for ${keyName}:`, err);
    }
  }

  // 2. Check MockStore
  const mockRec = mockStore.getApiKeyRecord(keyName);
  if (mockRec?.encrypted_value) {
    const decrypted = decryptSecret(mockRec.encrypted_value);
    if (decrypted) return decrypted;
  }

  // 3. Fallback to process.env
  const envVal = process.env[keyName];
  if (envVal && !envVal.includes("...") && envVal !== "your-bot-token") {
    return envVal.trim();
  }

  return null;
}

/**
 * Saves or updates an encrypted secret to the database & mockStore
 */
export async function saveSecret(
  keyName: string,
  plainValue: string,
  serviceName?: string
): Promise<boolean> {
  const cleanVal = plainValue.trim();
  if (!cleanVal) {
    return await deleteSecret(keyName);
  }

  const encrypted = encryptSecret(cleanVal);
  const matchedDef = KNOWN_SECRETS.find((s) => s.keyName === keyName);
  const service = serviceName || matchedDef?.service || "system";
  const now = new Date().toISOString();

  // Always update mockStore
  mockStore.setApiKeyRecord(keyName, encrypted, service);

  // Update Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabaseAdmin.from("system_api_keys").upsert({
        key_name: keyName,
        encrypted_value: encrypted,
        service_name: service,
        description: matchedDef?.description || null,
        updated_at: now,
      });

      if (error) {
        console.warn(`[SecretManager] Supabase upsert error for ${keyName}:`, error.message);
      }
    } catch (err) {
      console.warn(`[SecretManager] Supabase exception for ${keyName}:`, err);
    }
  }

  return true;
}

/**
 * Removes a custom secret from the database (reverting to env fallback if exists)
 */
export async function deleteSecret(keyName: string): Promise<boolean> {
  mockStore.deleteApiKeyRecord(keyName);

  if (isSupabaseConfigured()) {
    try {
      await supabaseAdmin.from("system_api_keys").delete().eq("key_name", keyName);
    } catch (err) {
      console.warn(`[SecretManager] Supabase delete error for ${keyName}:`, err);
    }
  }

  return true;
}

/**
 * Returns safe status summaries for all known secrets (masked, no plain text)
 */
export async function getAllSecretStatuses(): Promise<Record<string, SecretStatusInfo>> {
  const dbRecords: Record<string, { encrypted_value: string; updated_at?: string }> = {};

  // Fetch all from Supabase
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseAdmin
        .from("system_api_keys")
        .select("key_name, encrypted_value, updated_at");

      if (!error && data) {
        for (const item of data) {
          dbRecords[item.key_name] = item;
        }
      }
    } catch (err) {
      console.warn("[SecretManager] Failed to fetch database secrets:", err);
    }
  }

  // Overlay with MockStore
  const mockAll = mockStore.getAllApiKeyRecords();
  for (const [k, v] of Object.entries(mockAll)) {
    if (!dbRecords[k]) {
      dbRecords[k] = v;
    }
  }

  const result: Record<string, SecretStatusInfo> = {};

  for (const def of KNOWN_SECRETS) {
    const k = def.keyName;
    const dbRec = dbRecords[k];

    if (dbRec?.encrypted_value) {
      const decrypted = decryptSecret(dbRec.encrypted_value);
      if (decrypted) {
        result[k] = {
          keyName: k,
          service: def.service,
          label: def.label,
          description: def.description,
          source: "database",
          maskedValue: def.isSecret ? maskSecret(decrypted) : decrypted,
          isConfigured: true,
          isSecret: Boolean(def.isSecret),
          updatedAt: dbRec.updated_at || null,
        };
        continue;
      }
    }

    // Check env fallback
    const envVal = process.env[k];
    if (envVal && !envVal.includes("...") && envVal !== "your-bot-token") {
      result[k] = {
        keyName: k,
        service: def.service,
        label: def.label,
        description: def.description,
        source: "env",
        maskedValue: def.isSecret ? maskSecret(envVal) : envVal,
        isConfigured: true,
        isSecret: Boolean(def.isSecret),
        updatedAt: null,
      };
      continue;
    }

    result[k] = {
      keyName: k,
      service: def.service,
      label: def.label,
      description: def.description,
      source: "missing",
      maskedValue: "",
      isConfigured: false,
      isSecret: Boolean(def.isSecret),
      updatedAt: null,
    };
  }

  return result;
}
