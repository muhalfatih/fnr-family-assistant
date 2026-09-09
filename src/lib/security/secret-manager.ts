import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { encryptSecret, decryptSecret, maskSecret } from "./encryption";

export interface SecretDefinition {
  keyName: string;
  service: "gemini" | "telegram" | "whatsapp" | "r2" | "sheets" | "supabase";
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

  // Supabase REST & Auth (View Only)
  {
    keyName: "NEXT_PUBLIC_SUPABASE_URL",
    service: "supabase",
    label: "Supabase Project URL",
    description: "Endpoint URL REST API & Auth instance Supabase.",
    placeholder: "https://your-project.supabase.co",
    isSecret: false,
  },
  {
    keyName: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    service: "supabase",
    label: "Supabase Anon Key (Public / Client)",
    description: "Kunci API publik (anon) untuk browser client dan otentikasi pengguna.",
    placeholder: "eyJhbGciOiJIUzI1NiIsIn...",
    isSecret: true,
  },
  {
    keyName: "SUPABASE_SECRET_KEY",
    service: "supabase",
    label: "Supabase Service Role / Secret Key",
    description: "Kunci rahasia server admin dengan hak bypass Row Level Security (RLS).",
    placeholder: "eyJhbGciOiJIUzI1NiIsIn...",
    isSecret: true,
  },
  {
    keyName: "SUPABASE_JWT_SECRET",
    service: "supabase",
    label: "Supabase JWT Secret",
    description: "Kunci rahasia tanda tangan token autentikasi JWT dan kunci enkripsi aplikasi.",
    placeholder: "super-secret-jwt-token...",
    isSecret: true,
  },

  // PostgreSQL Connection (View Only)
  {
    keyName: "POSTGRES_URL",
    service: "supabase",
    label: "PostgreSQL Connection String (Pooled)",
    description: "URI koneksi langsung PostgreSQL via Supabase Connection Pooler (Port 6543).",
    placeholder: "postgres://postgres.xxx:password@...",
    isSecret: true,
  },
  {
    keyName: "POSTGRES_HOST",
    service: "supabase",
    label: "PostgreSQL Database Host",
    description: "Nama host server basis data AWS / Supabase pooler.",
    placeholder: "aws-0-ap-southeast-1.pooler.supabase.com",
    isSecret: false,
  },
  {
    keyName: "POSTGRES_USER",
    service: "supabase",
    label: "PostgreSQL Database User",
    description: "Username akun pengguna basis data PostgreSQL.",
    placeholder: "postgres.xxx",
    isSecret: false,
  },
  {
    keyName: "POSTGRES_DATABASE",
    service: "supabase",
    label: "PostgreSQL Database Name",
    description: "Nama basis data default PostgreSQL.",
    placeholder: "postgres",
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

function getEnvWithFallback(keyName: string): string | null {
  const isMeaningful = (val?: string) =>
    Boolean(val && !val.includes("...") && !val.startsWith("your-") && val !== "placeholder");

  const direct = process.env[keyName];
  if (isMeaningful(direct)) {
    return direct!.trim();
  }

  // Aliases for Supabase and Postgres
  const aliases: Record<string, string[]> = {
    NEXT_PUBLIC_SUPABASE_URL: ["SUPABASE_URL"],
    SUPABASE_URL: ["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: [
      "SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ],
    SUPABASE_ANON_KEY: [
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ],
    SUPABASE_SECRET_KEY: ["SUPABASE_SERVICE_ROLE_KEY"],
    SUPABASE_SERVICE_ROLE_KEY: ["SUPABASE_SECRET_KEY"],
  };

  const fallbacks = aliases[keyName] || [];
  for (const fb of fallbacks) {
    const val = process.env[fb];
    if (isMeaningful(val)) {
      return val!.trim();
    }
  }

  return null;
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

  // 2. Fallback to process.env
  const envVal = getEnvWithFallback(keyName);
  if (envVal) {
    return envVal;
  }

  return null;
}

/**
 * Saves or updates an encrypted secret to the database
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
    const envVal = getEnvWithFallback(k);
    if (envVal) {
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

/**
 * Returns full decrypted plain text values for all configured secrets.
 * Strictly gated by security verification (Password or OTP) on the server.
 */
export async function getAllDecryptedSecrets(): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const def of KNOWN_SECRETS) {
    const val = await getSecret(def.keyName);
    if (val) {
      result[def.keyName] = val;
    }
  }

  return result;
}
