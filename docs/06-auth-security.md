# 06 — Auth & Security (Anti-Bruteforce)

Target brute-force utama = **login admin**. Kalau jebol, seluruh toko dikuasai.
Urutan di bawah = leverage tertinggi ke terendah.

## 1. Pakai Supabase Auth — jangan bikin auth sendiri

Keputusan paling penting. Bikin login manual = harus bangun semua proteksi dari nol dan
pasti ada yang bolong. Supabase Auth gratis kasih: password ter-hash (bcrypt),
**rate limiting bawaan**, dukungan **CAPTCHA**, **MFA/2FA**, sesi aman. Prisma tetap
dipakai untuk produk/order — auth-nya saja diserahkan ke Supabase. Ini menutup ~80%
permukaan serangan tanpa ngoding.

## 2. CAPTCHA di halaman login

Pasang **Cloudflare Turnstile** (gratis) — Supabase Auth support native. Aktifkan khusus
di form login & reset password. Bot kejegal, manusia nyaris tak terganggu.

## 3. Rate limit di route login (lapisan app)

Meski Supabase sudah punya, tambahkan di level app pakai **Upstash Redis** (free tier).
Batasi **hanya route login**, bukan seluruh situs.

```ts
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"), // maks 5 percobaan / menit / IP
});

export async function middleware(req) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await ratelimit.limit(`login_${ip}`);
  if (!success) {
    return new NextResponse("Terlalu banyak percobaan. Coba lagi nanti.", { status: 429 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/masuk", "/admin/login", "/api/auth/:path*"], // hanya endpoint login
};
```

## 4. Kerasin pintu admin (crown jewel)

- **MFA/2FA WAJIB** untuk admin (TOTP via Supabase Auth). Pertahanan terkuat: password
  bocor pun, penyerang tetap tak bisa masuk.
- **Path admin jangan gampang ditebak** — hindari `/admin` polos; jangan ada link admin
  di storefront publik.
- **Batasi akses admin** — karena solo/tim kecil, kunci ke **IP sendiri** atau minimal
  **geo-block ke Indonesia** via Vercel Firewall.

## 5. Jangan bocorin info ke penyerang

- **Error generic:** selalu "email atau password salah" — jangan pisahkan "email tidak
  terdaftar" vs "password salah" (yang kedua membocorkan email valid).
- **Lockout bertahap** + delay makin lama (exponential backoff).

## 6. Cloudflare di depan (gratis, kuat)

Proxy domain lewat **Cloudflare (free)** → dapat **WAF, Bot Fight Mode, DDoS protection**
seluruh situs, gratis. Lapisan terluar yang menyaring sebelum menyentuh Vercel. Vercel juga
punya **Attack Challenge Mode** untuk dinyalakan saat diserang.
(Detail DNS + Cloudflare ada di `07-deployment-dns.md`.)

## 7. Higiene dasar (sekali set)

- Cookie sesi `HttpOnly`, `Secure`, `SameSite=Lax` (default Supabase Auth).
- Password minimal kuat (panjang > kompleksitas ribet).
- Log percobaan gagal + alert kalau ada lonjakan.

## Ringkasan kombinasi

**Supabase Auth + Turnstile + MFA admin + rate limit route login + Cloudflare di depan.**
Semua gratis / sudah termasuk — tidak menambah biaya bulanan.

## Env

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, JANGAN ke client
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
TURNSTILE_SECRET_KEY=...
```
