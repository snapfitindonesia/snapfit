# 09 — Keamanan

## Login & akun

- Auth memakai **Supabase Auth** (email+password, Google OAuth) — password tidak
  pernah disimpan di database toko.
- **Turnstile** (Cloudflare CAPTCHA) di form masuk & daftar, diverifikasi di server
  (`lib/security/turnstile.ts`).
- **Rate limit**: POST ke `/masuk` & `/daftar` maks **5 per menit per IP**
  (`middleware.ts` → Upstash). Lacak pesanan maks **10 per menit per IP**.
- Pesan galat login dibuat umum (tidak membocorkan apakah email terdaftar).

## Panel admin (`/admin`, `/api/admin/*`)

Dijaga berlapis — gagal di satu lapis berarti ditolak (*fail-closed*):

1. `middleware.ts`: wajib login → wajib `app_metadata.role === "admin"` → wajib MFA
   (AAL2) bila `ADMIN_REQUIRE_MFA=true`.
2. Setiap Server Action admin memanggil `requireAdmin()` (`lib/auth/require-admin.ts`)
   — tidak bergantung pada middleware saja.
3. `ADMIN_DEV_BYPASS=true` melewati gerbang **hanya untuk lokal**; jangan pernah diisi
   di Vercel.

Menjadikan user admin: Supabase → Authentication → Users → user → *Raw app metadata*
→ `{"role":"admin"}`.

**Disarankan:** aktifkan `ADMIN_REQUIRE_MFA=true` setelah semua admin mendaftarkan
authenticator di `/admin/mfa`.

## Data pelanggan

- Halaman lacak pesanan wajib nomor pesanan **dan** email/HP yang cocok, hanya
  menampilkan nama depan & kota.
- Data pribadi tidak pernah ditaruh di URL (query string).
- Email/HP ke Meta CAPI dikirim dalam bentuk hash SHA-256.

## API & webhook

- Webhook Midtrans memverifikasi signature SHA-512 sebelum mengubah pesanan.
- Route cron wajib `Authorization: Bearer <CRON_SECRET>`.
- Upload admin menerima URL gambar jarak jauh dengan pengaman SSRF (hanya http/https,
  alamat privat/lokal ditolak) dan batas ukuran.
- Harga, diskon, dan voucher selalu dihitung ulang di server saat checkout.
- Form ulasan `/api/ulasan`: wajib token pesanan valid (status Dikirim/Selesai), produk harus
  ada di pesanan, 1 ulasan per produk (dijaga kunci advisory Postgres — kiriman ganda bersamaan
  tak lolos), rate-limit 10/10 menit per IP, foto ≤ 4 MB & harus gambar; ulasan menunggu
  moderasi sebelum tampil.
- **Login/daftar** dibatasi 5 percobaan/menit/IP di Server Action (`lib/actions/auth.ts`) — form
  login juga ada di popup semua halaman toko, jadi tak bisa dibatasi per path di middleware.
- Fungsi "tandai lunas" (`handlePaidOrder`) & ringkasan pesanan ada di `lib/orders/paid.ts`
  (`server-only`, **bukan** file `"use server"`) → tak bisa dipanggil dari browser. Hanya
  webhook Midtrans (signature) & tombol admin (`markOrderPaid` + `requireAdmin`) yang memakainya.
- **Header keamanan** (`next.config.mjs` → `headers()`): `X-Frame-Options: SAMEORIGIN` +
  CSP `frame-ancestors 'self'` (anti clickjacking panel admin; pratinjau email admin memakai iframe
  same-origin), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (kamera/mikrofon/lokasi dimatikan). HSTS dari Vercel.

## Rahasia

- Rahasia **hanya** di `.env` (sudah di `.gitignore`) dan Vercel env.
- Jangan tempel kunci di chat/tiket/commit. Bila terlanjur → **roll/ganti** kunci itu di
  penyedianya, perbarui `.env` + Vercel, deploy ulang.
- Token dengan hak luas (Supabase service role, R2, Ginee, CAPI) hanya dipakai di
  server — tidak boleh berawalan `NEXT_PUBLIC_`.
