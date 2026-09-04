import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isUpstashConfigured } from "@/lib/supabase/config";

// Rate-limit lapisan app KHUSUS route login (docs/06). Maks 5 percobaan / menit / IP.
// Bila Upstash belum dikonfigurasi → dilewati (Supabase Auth tetap punya limit bawaan).
let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (!isUpstashConfigured()) return null;
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "60 s"),
    });
  }
  return limiter;
}

export async function limitLogin(
  ip: string,
): Promise<{ success: boolean; skipped: boolean }> {
  const l = getLimiter();
  if (!l) return { success: true, skipped: true };
  const { success } = await l.limit(`login_${ip}`);
  return { success, skipped: false };
}
