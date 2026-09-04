import { isTurnstileConfigured } from "@/lib/supabase/config";

// Verifikasi token Cloudflare Turnstile di server (docs/06).
// Belum dikonfigurasi → lewati (dev). Sudah dikonfigurasi → token wajib & valid.
export async function verifyTurnstile(
  token: string | null,
  ip?: string,
): Promise<boolean> {
  if (!isTurnstileConfigured()) return true;
  if (!token) return false;

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY as string,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    },
  );
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
