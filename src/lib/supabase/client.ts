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
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_URL,
].find(isValidUrl) || "https://placeholder.supabase.co";

const supabaseAnonKey = [
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_PUBLISHABLE_KEY,
].find(isValidKey) || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
