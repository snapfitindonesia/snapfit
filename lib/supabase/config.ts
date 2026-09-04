// Deteksi konfigurasi layanan. Kalau Supabase belum diisi → auth OFF dan admin
// dikunci total (fail-closed). Lihat docs/06-auth-security.md.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET_KEY,
  );
}

/** Role admin ditandai di app_metadata.role = "admin" (diset via Supabase dashboard). */
export const ADMIN_ROLE = "admin";
