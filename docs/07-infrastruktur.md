# 07 — Infrastruktur, env & deploy

## Peta layanan

| Layanan | Untuk | Akun / catatan |
|---|---|---|
| **Vercel** (Hobby) | Hosting Next.js, cron, optimasi gambar | tim `mandimalems-projects` |
| **Cloudflare** | DNS `snapfit.id` + R2 | akun `3d6e…` (NS `archer`/`lia.ns.cloudflare.com`) |
| **Cloudflare R2** | Foto (`snapfit`, publik via `cdn.snapfit.id`) & backup DB (`snapfit-backup`, privat) | egress gratis |
| **Supabase** | Postgres + Auth | ref `httdykpmkzhmpqldnfhc` |
| **Upstash Redis** | Rate limit login & lacak pesanan | |
| **Resend** | Email transaksional | domain `snapfit.id` (Tokyo) |
| **aRenHost cPanel** | Kotak surat `admin@snapfit.id` (MX → `mail.snapfit.id`) | tidak lagi untuk web/foto |
| **GitHub** | Kode (`mandimalem/snapfit`) | |

### DNS (di Cloudflare)
- `snapfit.id` (A) & `www` (CNAME) → Vercel, **DNS only** (awan abu-abu).
- `cdn` → bucket R2 `snapfit` (custom domain, di-proxy Cloudflare).
- `mail`, `webmail`, `cpanel`, `ftp`, `autodiscover` → server cPanel; MX → `mail.snapfit.id`.
- Resend: CNAME `send`/`rsend` + TXT DKIM. SPF/DMARC di TXT root.

> ISP tertentu di Indonesia membajak DNS port 53 dan memblokir `*.r2.dev`. Untuk cek
> DNS pakai DoH:
> `curl -H "accept: application/dns-json" "https://1.1.1.1/dns-query?name=cdn.snapfit.id&type=A"`

## Deploy

Auto-deploy dari GitHub **tidak andal** — deploy manual via CLI:

```bash
npm run build
```

```bash
npx vercel deploy --prod --yes
```

- Butuh env `VERCEL_TOKEN` (buat di Vercel → Account Settings → Tokens).
- Build gagal diam-diam bila `vercel.json` berisi cron lebih sering dari **harian**
  (batas paket Hobby).
- Setiap deploy disimpan Vercel dan memakan kuota *Functions Storage*; hapus deploy
  lama sesekali bila mendekati batas.

## Cron (`vercel.json`, semua UTC)

| Jadwal | WIB | Route | Tugas |
|---|---|---|---|
| `0 3 * * *` | 10:00 | `/api/cron/review-request` | Email ajakan ulasan (7 hari setelah dikirim) |
| `0 4 * * *` | 11:00 | `/api/cron/ginee-stock` | Sinkron stok/harga dummy + arsip produk Ginee |
| `0 12 * * *` | 19:00 | `/api/cron/payment-reminder` | Pengingat bayar pesanan PENDING |
| `0 13 * * *` | 20:00 | `/api/cron/abandoned-cart` | Email pengingat keranjang ditinggal + pembersihan data (draf > 60 hari, kata kunci sekali-cari > 90 hari) |
| `0 20 * * *` | 03:00 | `/api/cron/db-backup` | Backup DB → R2 privat |

Semua route cron mewajibkan header `Authorization: Bearer <CRON_SECRET>`
(Vercel menambahkannya otomatis).

## Gambar & kuota Vercel

- Foto disimpan sebagai WebP di R2 dalam **4 ukuran**: `https://cdn.snapfit.id/<nama>.webp`
  (≤1200px) + `<nama>.w128/.w384/.w750.webp` (q75, sama dengan titik srcset next/image). Varian dibuat otomatis oleh
  `uploadToR2` (upload admin, impor Ginee, foto ulasan) dan ikut terhapus oleh `deleteFromR2`.
- Ditampilkan lewat `@/components/ui/image` (wrapper `next/image`) — semua **langsung**
  dari CDN, tanpa kuota *Image Optimization* Vercel (5.000 transformasi/bulan):
  - `cdn.snapfit.id` → varian terkecil yang ≥ lebar diminta (≤128 → `.w128`, ≤384 → `.w384`, ≤750 → `.w750`,
    selebihnya asli). Kartu produk di HP ±15 KB, banner HP ±30 KB — setara hasil Vercel dulu.
  - **Pengecualian:** foto `priority` dari `cdn.snapfit.id` (banner pertama, 4 kartu teratas,
    foto utama PDP, popup) lewat `/_next/image` — satu domain dengan halaman, jadi elemen LCP
    tak menunggu koneksi baru di HP. Jumlahnya kecil (±beberapa ratus transformasi/bulan).
  - Foto marketplace (Shopee, Tokopedia, TikTok/ibyteimg, Ginee, Shopify) → ukuran bawaan CDN asalnya.
  - Host lain → lewat `/_next/image` (WebP, cache 31 hari).
- **Syarat penting:** setiap URL `cdn.snapfit.id` di DB wajib punya varian, kalau tidak
  thumbnail-nya 404. Cek/buat dengan `scripts/cdn-variants.mjs` (lihat [10](10-operasional.md)).
  Upload di luar `uploadToR2` (mis. langsung lewat dashboard Cloudflare) → jalankan skrip itu.
- **Jangan** memasang `images.loader: "custom"` global — `/_next/image` jadi 404 di Vercel.
- Host gambar baru harus ditambahkan ke `remotePatterns` di `next.config.mjs`
  (atau env `NEXT_PUBLIC_IMAGE_HOSTS`, dipisah koma).

## Environment variables

Isi di **Vercel → Project → Settings → Environment Variables** (Production) dan di
`.env` lokal. 🔒 = rahasia, jangan pernah ditampilkan di klien/chat.

| Kelompok | Variabel |
|---|---|
| Database | `DATABASE_URL` 🔒 (pooler), `DIRECT_URL` 🔒 (koneksi langsung untuk Prisma) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 🔒 |
| Admin | `ADMIN_REQUIRE_MFA` (`true` = wajib MFA), `ADMIN_DEV_BYPASS` (**hanya lokal**), `ADMIN_NOTIFY_EMAIL` |
| Keamanan | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` 🔒, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` 🔒, `CRON_SECRET` 🔒 |
| Storage | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` 🔒, `R2_SECRET_ACCESS_KEY` 🔒, `R2_BUCKET`, `R2_PUBLIC_URL`, `BACKUP_R2_BUCKET` |
| Email | `RESEND_API_KEY` 🔒, `EMAIL_FROM`, `EMAIL_REPLY_TO` |
| Pembayaran | `PAYMENT_MODE`, `MIDTRANS_SERVER_KEY` 🔒, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `MANUAL_BANK_NAME`/`_NUMBER`/`_HOLDER` |
| Pengiriman | `SHIPPING_MODE`, `SHIPPING_FLAT_COST`, `FREE_SHIPPING_MIN`, `FREE_SHIPPING_MAX`, `BITESHIP_API_KEY` 🔒, `ORIGIN_POSTAL_CODE` |
| Ginee | `GINEE_ACCESS_KEY` 🔒, `GINEE_SECRET_KEY` 🔒, `GINEE_WAREHOUSE_ID`, `GINEE_MANUAL_SHOP_ID`, `GINEE_SYNC_PRICE`, `GINEE_PRICE_SHOP_NAME`, `GINEE_PRICE_CHANNEL`, `GINEE_HOST`, `GINEE_COUNTRY` |
| Tracking | `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FB_PIXEL_ID`, `FB_PIXEL_ID`, `FB_CAPI_ACCESS_TOKEN` 🔒, `FB_CAPI_TEST_CODE`, `NEXT_PUBLIC_GCR_MERCHANT_ID` |
| Situs | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_STORE_WA`, `NEXT_PUBLIC_IMAGE_HOSTS` |

Sebagian besar punya nilai bawaan di kode; yang **wajib** di produksi: Database,
Supabase, R2, `CRON_SECRET`, Upstash, Resend, Ginee, FB CAPI.

Variabel sisa di Vercel yang **tidak dipakai** kode lagi (boleh dihapus):
`NEXT_PUBLIC_GTM_ID`, `MIDTRANS_CLIENT_KEY`, `ORIGIN_AREA_ID`, `ORIGIN_CITY`.

### Menambah/mengganti rahasia
Jangan menempelkan nilai rahasia di chat, commit, atau baris perintah (tercatat di
riwayat). Tulis ke file lalu salurkan lewat stdin:

```bash
npx vercel env add NAMA_VARIABEL production --force < file-berisi-nilai.txt
```

Hapus file itu setelahnya, lalu deploy ulang.

## Prisma tanpa mesin Rust (Functions Storage)
- `engineType = "client"` + `@prisma/adapter-pg` (`lib/db.ts`): query lewat driver `pg` ke pooler Supabase
  (`DATABASE_URL`, :6543). Fungsi Vercel ±23,7 MB → ±2,7 MB (sebelum kompres); dulu ±1,2 GB per deploy
  (±130 fungsi × 9,5 MB) sehingga Functions Storage Hobby (10 GB) penuh.
- **Skrip Node (`scripts/*.mjs`) wajib memakai adapter**: `new PrismaClient({ adapter: new PrismaPg({ connectionString:
  process.env.DATABASE_URL }) })` — `new PrismaClient()` polos kini error.
- **`next.config.mjs` → `outputFileTracingIncludes` WAJIB memuat `query_compiler_bg.wasm`** — file itu dibaca lewat
  fs sehingga tak ikut terkemas otomatis; tanpa ini SEMUA query di Vercel gagal (ENOENT) walau lokal jalan
  (terjadi 28 Sep, di-rollback). Ukuran nyata di Vercel: 9,53 MB → 2,5 MB per fungsi (±0,3 GB per deploy).
- `prisma db push` tetap memakai `DIRECT_URL` (tak berubah).
- Deploy cukup `git push` (auto-deploy GitHub) — jangan ditambah `vercel deploy` (jadi 2 deploy).
