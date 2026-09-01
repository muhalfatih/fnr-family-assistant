import { createClient } from "@supabase/supabase-js";

function isValidUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return (
    (trimmed.startsWith("https://") || trimmed.startsWith("http://")) &&
    !trimmed.includes("placeholder") &&
    !trimmed.includes("your-project")
  );
}

function isValidKey(key?: string): boolean {
  if (!key) return false;
  const trimmed = key.trim();
  return (
    trimmed.length > 10 &&
    !trimmed.startsWith("your-") &&
    !trimmed.startsWith("placeholder")
  );
}

const supabaseUrl = [
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
].find(isValidUrl) || "https://placeholder.supabase.co";

const supabaseSecretKey = [
  process.env.SUPABASE_SECRET_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
].find(isValidKey) || "placeholder-service-key";

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
