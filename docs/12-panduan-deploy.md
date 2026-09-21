# 12 — Panduan Deploy & Go Live (Vercel, Supabase, DNS, Kredensial)

Panduan langkah-demi-langkah membawa SNAPFIT dari localhost ke produksi. Urutan penting —
kerjakan dari atas. Semua kredensial **Anda** yang isi (Claude tak pernah pegang key asli);
taruh di Vercel Environment Variables, jangan commit ke git.

> Arsitektur produksi (pola hybrid, lihat `07-deployment-dns.md`):
> - **App Next.js** (storefront + admin) → **Vercel** (`snapfit.id`, `www`)
> - **Aset gambar** (produk, banner) → **hosting cPanel** (`cdn.snapfit.id`)
> - **Database + Auth** → **Supabase** (Postgres + Auth)

---

## 0. Checklist urutan (ringkas)

1. [ ] Push repo ke GitHub
2. [ ] Buat project Supabase → DB + Auth
3. [ ] Ganti Prisma SQLite → Postgres + migrate + seed
4. [ ] Buat Upstash Redis (rate-limit login)
5. [ ] Buat Cloudflare Turnstile (CAPTCHA)
6. [ ] Siapkan storage gambar admin (cPanel atau Supabase Storage)
7. [ ] Midtrans → mode Production + set webhook
8. [ ] Biteship → API key produksi + origin
9. [ ] Resend → API key + verifikasi domain email
10. [ ] GTM + Meta Pixel + GA4
11. [ ] Import repo ke Vercel + isi SEMUA env + deploy
12. [ ] Set DNS (A/CNAME) — JANGAN migrasi NS
13. [ ] Post-launch checklist (matikan dev-bypass, tes transaksi kecil)

---

## 1. Repo ke GitHub

```bash
git init
git add -A
git commit -m "SNAPFIT siap deploy"
git branch -M main
git remote add origin https://github.com/<user>/snapfit.git
git push -u origin main
```

`.gitignore` sudah mengecualikan `.env`, `node_modules`, `prisma/*.db`, `.next`. **Pastikan
`.env` tidak ikut ter-push** (`git status` harus tidak menampilkannya).

---

## 2. Supabase (Database + Auth)

1. Buat akun di [supabase.com](https://supabase.com) → **New project**. Pilih region
   terdekat (mis. Singapore) → set **Database Password** (simpan!).
2. **Settings → API**, catat:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**RAHASIA**, server-only)
3. **Settings → Database → Connection string** — ambil dua bentuk:
   - **Pooled** (port 6543, `pgbouncer`) → untuk `DATABASE_URL` (dipakai app saat runtime).
   - **Direct** (port 5432) → untuk `DIRECT_URL` (dipakai Prisma migrate).
4. **Authentication → Providers → Email**: aktifkan. Atur "Confirm email" sesuai selera
   (untuk awal boleh dimatikan biar cepat testing).
5. **Authentication → Attack Protection → CAPTCHA**: nanti isi Turnstile (langkah 5).
6. **Authentication → MFA**: aktifkan **TOTP** (wajib untuk admin, `06-auth-security.md`).

### Menandai user sebagai admin

Middleware & `requireAdmin()` mengecek `app_metadata.role === "admin"`. Setelah user admin
mendaftar, jalankan di **Supabase → SQL Editor** (atau via API service-role):

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'admin@snapfit.id';
```

Lalu admin login → diarahkan ke `/admin/mfa` untuk enroll TOTP → baru bisa buka dashboard.

---

## 3. Prisma: SQLite → Postgres

> Migration lokal saat ini dibuat untuk SQLite dan **tidak** kompatibel Postgres. Untuk
> produksi, buat ulang migration Postgres.

1. Tukar datasource ke Postgres (1 perintah — mengganti blok `datasource` saja):
   ```bash
   npm run db:use-postgres
   ```
   (untuk balik ke SQLite dev lokal: `npm run db:use-sqlite`)
2. Set `.env`: `DATABASE_URL` (pooled :6543) + `DIRECT_URL` (direct :5432) dari Supabase.
3. Buat migration Postgres baru (migration SQLite lama tak kompatibel):
   ```bash
   rm -rf prisma/migrations
   npx prisma migrate dev --name init_postgres
   npm run db:seed        # opsional: isi data contoh
   ```
   Alternatif cepat tanpa migration file: `npx prisma db push`.
4. Di produksi, Vercel akan menjalankan `prisma generate` (via `postinstall`). Untuk apply
   migration di deploy, tambahkan build command Vercel: `prisma migrate deploy && next build`
   (lihat langkah 11).

> **Jaga egress murah:** simpan hanya teks + URL gambar di DB (gambar tetap di CDN). 500MB
> Supabase Free muat ribuan produk (`10-biaya.md`).

---

## 4. Upstash Redis (rate-limit login)

1. [upstash.com](https://upstash.com) → **Create Database** (Redis), region dekat.
2. Tab **REST API**, catat:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Tanpa ini, rate-limit app dilewati (Supabase tetap punya limit bawaan) — tapi disarankan
   diisi untuk lapisan ekstra di route login.

---

## 5. Cloudflare Turnstile (CAPTCHA login)

1. Cloudflare Dashboard → **Turnstile → Add site**. Domain: `snapfit.id`.
2. Catat:
   - **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - **Secret Key** → `TURNSTILE_SECRET_KEY`
3. (Opsional) Masukkan juga ke Supabase → Auth → CAPTCHA agar login Supabase ikut terproteksi.

---

## 6. Storage gambar admin

Vercel filesystem **ephemeral** — upload admin tak boleh ke `public/`. Saat ini form admin
memakai **field URL** (tempel URL gambar). Dua opsi untuk upload sungguhan:

- **Hemat (pakai cPanel):** upload file ke hosting → dapat URL `https://cdn.snapfit.id/...` →
  tempel ke field foto produk/banner.
- **Rapi (Supabase Storage):** buat bucket publik `product-images`, upload, pakai URL
  `https://<project>.supabase.co/storage/v1/object/public/...`. Tambah host-nya ke
  `NEXT_PUBLIC_IMAGE_HOSTS` (dibaca `next.config.ts`).

> Menyediakan tombol upload asli di admin (drag-drop → storage) masih **TODO** — sekarang
> alurnya tempel-URL.

---

## 7. Midtrans → Production

1. Dashboard Midtrans → **Settings → Access Keys**, mode **Production**:
   - `MIDTRANS_SERVER_KEY` (rahasia)
   - `MIDTRANS_CLIENT_KEY` + `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` (sama, untuk Snap.js)
   - Set `MIDTRANS_IS_PRODUCTION="true"`
2. **Settings → Configuration → Payment Notification URL** (webhook):
   `https://snapfit.id/api/midtrans/webhook`
3. **Finish/Unfinish/Error redirect**: `https://snapfit.id/checkout/sukses`

> **TODO kode:** integrasi Snap.js sungguhan (`snap.pay(token)`) belum terpasang — saat ini
> jalur mock. Perlu diselesaikan bersamaan pengisian key Midtrans agar popup bayar muncul.

---

## 8. Biteship

1. Dashboard Biteship → **API Keys** (Live) → `BITESHIP_API_KEY`.
2. Set alamat origin toko: `ORIGIN_POSTAL_CODE`, `ORIGIN_CITY` (dan `ORIGIN_AREA_ID` bila
   pakai Area ID Biteship). Tanpa key → tarif memakai mock.

---

## 9. Resend (email order)

1. [resend.com](https://resend.com) → **API Keys** → `RESEND_API_KEY`.
2. **Domains** → verifikasi `snapfit.id` (tambah record DKIM/SPF di DNS).
3. Set `EMAIL_FROM="SNAPFIT <no-reply@snapfit.id>"`. Tanpa key → email hanya di-log.

---

## 10. Tracking (GTM + Pixel + GA4)

1. [tagmanager.google.com](https://tagmanager.google.com) → buat container Web → ID
   `GTM-XXXXXX` → `NEXT_PUBLIC_GTM_ID`.
2. Di dalam GTM, pasang tag **GA4** dan **Meta Pixel**, trigger dari event dataLayer yang
   sudah dikirim app: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`
   (`08-tracking.md`).

---

## 11. Vercel: import & deploy

1. [vercel.com](https://vercel.com) → **Add New → Project** → import repo GitHub.
2. Framework auto-detect **Next.js**. **Build & Output Settings → Build Command** (override):
   ```
   prisma migrate deploy && next build
   ```
   (agar migration ke Postgres jalan tiap deploy; kalau pakai `db push`, cukup `next build`).
3. **Environment Variables** — isi SEMUA (tabel di §13). **Jangan** set `ADMIN_DEV_BYPASS`
   (atau set `"false"`) — di produksi otomatis nonaktif, tapi lebih aman tidak ada.
4. **Deploy**. Setelah sukses, cek URL `*.vercel.app`.
5. **Settings → Domains** → tambah `snapfit.id` dan `www.snapfit.id` → Vercel tampilkan
   record DNS yang harus dibuat (langkah 12).

---

## 12. DNS — JANGAN migrasi NS ke Vercel

Cukup **tambah record** di registrar/Cloudflare (NS tetap di tempat) — biar hosting cPanel
(CDN) & email tetap jalan (`07-deployment-dns.md`).

| Record | Host | Nilai |
|--------|------|-------|
| A | `@` (apex) | IP Vercel yang ditampilkan dashboard (mis. `76.76.21.21`) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME/A | `cdn` | arahkan ke hosting cPanel |
| MX | `@` | **biarkan** menunjuk ke mail hosting (jangan diutak-atik) |

- ⚠️ **Jangan pindah NS ke Vercel** → bisa memutus email (`admin@snapfit.id`) & CDN.
- (Opsional) Untuk WAF/Bot Fight gratis: pindah NS ke **Cloudflare** (bukan Vercel), set
  apex/www → Vercel, `cdn` → hosting, MX → hosting, mulai mode **DNS-only**.
- Vercel otomatis terbitkan SSL setelah record propagasi.

---

## 13. Master daftar Environment Variables (isi di Vercel)

| Variable | Wajib | Isi dari | Catatan |
|----------|-------|----------|---------|
| `DATABASE_URL` | ✅ | Supabase pooled (6543) | runtime |
| `DIRECT_URL` | ✅ | Supabase direct (5432) | migrate |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase API | publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase API | publik |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase API | **rahasia** |
| `MIDTRANS_SERVER_KEY` | ✅ | Midtrans (Production) | **rahasia** |
| `MIDTRANS_CLIENT_KEY` | ✅ | Midtrans | |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | ✅ | = client key | publik (Snap.js) |
| `MIDTRANS_IS_PRODUCTION` | ✅ | `"true"` | |
| `BITESHIP_API_KEY` | ✅ | Biteship (Live) | **rahasia** |
| `ORIGIN_POSTAL_CODE` | ✅ | alamat toko | |
| `ORIGIN_CITY` | ➖ | alamat toko | |
| `ORIGIN_AREA_ID` | ➖ | Biteship area | opsional |
| `UPSTASH_REDIS_REST_URL` | ➖ | Upstash | rate-limit |
| `UPSTASH_REDIS_REST_TOKEN` | ➖ | Upstash | **rahasia** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ➖ | Turnstile | publik |
| `TURNSTILE_SECRET_KEY` | ➖ | Turnstile | **rahasia** |
| `NEXT_PUBLIC_GTM_ID` | ➖ | GTM | publik |
| `RESEND_API_KEY` | ➖ | Resend | **rahasia** |
| `EMAIL_FROM` | ➖ | mis. `SNAPFIT <no-reply@snapfit.id>` | |
| `NEXT_PUBLIC_IMAGE_HOSTS` | ➖ | host CDN tambahan (mis. supabase) | koma-pisah |
| `ADMIN_DEV_BYPASS` | ❌ | **jangan diisi di produksi** | dev-only |

`✅ wajib · ➖ opsional (fitur aktif saat diisi) · ❌ jangan di produksi`

---

## 14. Post-launch checklist (Anda, manual)

- [ ] `ADMIN_DEV_BYPASS` tidak ada / `"false"` di Vercel.
- [ ] Set satu user jadi admin (`app_metadata.role`), enroll MFA.
- [ ] Midtrans & Turnstile pakai key **Production**.
- [ ] Webhook Midtrans menunjuk `https://snapfit.id/api/midtrans/webhook`.
- [ ] Tes transaksi asli nominal kecil (QRIS termurah) sebelum promosi.
- [ ] Cek email konfirmasi & resi benar-benar masuk (Resend domain verified).
- [ ] Upgrade Supabase ke **Pro** saat sudah menghasilkan (backup harian, no-pause).
- [ ] (Opsional) Cloudflare di depan untuk WAF/Bot Fight.

---

## 15. TODO kode sebelum 100% produksi

Ketiganya sudah **dikerjakan** dan aktif otomatis saat key/DB diisi:

1. **Snap.js** ✅ — `snap.pay(token)` terpasang (`components/shop/snap-script.tsx`, dipakai di
   `checkout-view`). URL sandbox/production dideteksi dari prefix client key. Tanpa key →
   jalur simulasi mock tetap tersedia.
2. **Upload gambar admin** ✅ — tombol Upload di form produk & banner → `POST /api/admin/upload`
   → Supabase Storage (bucket `product-images`, harus dibuat publik). Field URL tetap sebagai
   fallback. Tanpa Supabase → tombol memberi pesan, tempel URL manual.
3. **Prisma Postgres** ✅ — `npm run db:use-postgres` (dan `db:use-sqlite` untuk balik).
   Default committed tetap SQLite agar dev lokal jalan tanpa setup; flip saat Supabase siap.

Sisanya (checkout, order, webhook signature, auth fail-closed, rate-limit, tracking, email)
juga sudah ter-wire ke env dan aktif otomatis begitu key diisi.

---

## 16. Biaya ringkas (`10-biaya.md`)

- **Pra-launch:** semua tier gratis → **Rp0/bulan**.
- **Live hemat:** Vercel Pro $20 + Supabase Free → **~Rp330rb/bulan** (tanpa backup).
- **Live aman:** Vercel Pro $20 + Supabase Pro $25 → **~Rp730rb/bulan** (backup, no-pause).
- Fee Midtrans per transaksi: QRIS 0,7% · VA Rp4.000 · kartu 2,9%+Rp2.000.
