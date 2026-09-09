import { createClient } from "@supabase/supabase-js";

function cleanVal(val?: string): string {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "");
}

function isValidUrl(url?: string): boolean {
  const trimmed = cleanVal(url);
  if (!trimmed) return false;
  return (
    (trimmed.startsWith("https://") || trimmed.startsWith("http://")) &&
    !trimmed.includes("placeholder") &&
    !trimmed.includes("your-project")
  );
}

function isValidKey(key?: string): boolean {
  const trimmed = cleanVal(key);
  if (!trimmed) return false;
  return (
    trimmed.length > 10 &&
    !trimmed.startsWith("your-") &&
    !trimmed.startsWith("placeholder")
  );
}

const rawUrl = [
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
].find(isValidUrl);

export const supabaseUrl = cleanVal(rawUrl) || "https://placeholder.supabase.co";

const rawKey = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
].find(isValidKey);

export const supabaseSecretKey = cleanVal(rawKey) || "placeholder-service-key";

/**
 * Supabase Admin Client with Secret/Service Role Key
 * Bypasses RLS - strictly for server-side API routes & Webhooks
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function isSupabaseConfigured(): boolean {
  const url = [process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL].find(isValidUrl);
  const key = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_ANON_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ].find(isValidKey);
  return Boolean(url && key);
}
