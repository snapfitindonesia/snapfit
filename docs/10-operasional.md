# 10 — Operasional & troubleshooting

## Yang berjalan otomatis tiap hari (WIB)

| Jam | Tugas | Cek hasilnya |
|---|---|---|
| 03:00 | Backup database → R2 `snapfit-backup` | Cloudflare → R2 → `snapfit-backup/db/` |
| 10:00 | Email ajakan ulasan (7 hari setelah dikirim) | `/admin/ulasan` |
| 11:00 | Sinkron stok Ginee + arsip produk yang dihapus | badge "Diarsipkan" di `/admin/produk` |
| 19:00 | Pengingat bayar pesanan PENDING | kolom pesanan |
| 20:00 | Pengingat keranjang ditinggal | `/admin/keranjang` (badge "Email terkirim") |

Log setiap cron: Vercel → Project → **Logs** (filter path `/api/cron/...`).

## Rutinitas yang disarankan

- **Harian**: proses pesanan masuk (email "Pesanan baru") — lihat [03](03-panel-admin.md#memproses-pesanan-transfer-manual); follow-up **Keranjang Ditinggal** via WhatsApp.
- **Mingguan**: cek produk "Diarsipkan"; cek varian berharga dummy yang perlu harga;
  cek **Admin → Pencarian → Tidak ada hasil** untuk ide restock/impor.
- **Bulanan**: cek kuota Vercel (Usage → *Image Optimization*, *Functions Storage*);
  hapus deploy lama bila storage mendekati batas; cek Merchant Center & katalog Meta
  untuk produk ditolak.

## Skrip perawatan (`scripts/`)

Jalankan dari folder proyek; `--env-file=.env` memuat kredensial. Semua skrip
**dry-run** (hanya menghitung) kecuali diberi flag.

| Skrip | Fungsi |
|---|---|
| `restore-backup.mjs` | Pulihkan data dari backup (lihat bawah) |
| `mirror-marketplace-images.mjs` | Salin foto yang masih menempel ke Shopee/TikTok/… ke `cdn.snapfit.id` (`--upload`), lalu ganti URL-nya di DB (`--rewrite`) |
| `migrate-image-host.mjs` | Ganti awalan URL foto di seluruh DB (mis. pindah domain CDN) |

```bash
node --env-file=.env scripts/mirror-marketplace-images.mjs --upload
```

### Restore database

```bash
node --env-file=.env scripts/restore-backup.mjs
```

Tanpa argumen: daftar backup yang tersedia. Lalu:

1. `… restore-backup.mjs 2026-09-26` → **dry-run**, membandingkan backup vs DB.
2. `… restore-backup.mjs 2026-09-26 --apply` → **menambahkan kembali** baris yang
   hilang. Tidak menimpa/menghapus data yang ada.
3. Untuk nilai yang *berubah* (bukan terhapus), unduh file backup dan salin manual.

Backup tidak mencakup akun login (Supabase Auth) dan file foto (R2).

## Troubleshooting

| Gejala | Kemungkinan penyebab | Tindakan |
|---|---|---|
| Produk tidak tampil di toko | stok 0 di gudang Ginee, harga dummy, atau diarsipkan | cek stok gudang di Ginee; isi harga; cek badge di admin |
| Stok web beda dengan Shopee | data Ginee belum sinkron / produk `syncLocked` | tunggu sinkron 11:00 atau jalankan cron manual; cek kunci sinkron |
| Harga Rp99.999 dst. | varian dummy dari marketplace | isi harga di form produk (varian dummy otomatis tak bisa dibeli) |
| Foto tidak muncul (host baru) | host belum ada di `remotePatterns` | tambahkan di `next.config.mjs` atau env `NEXT_PUBLIC_IMAGE_HOSTS` |
| `/_next/image` 404 semua | loader custom global dipasang | hapus `images.loader` di `next.config.mjs` |
| Deploy tidak muncul | cron > harian di `vercel.json` / auto-deploy GitHub macet | cek `vercel.json`; deploy via CLI |
| `prisma generate` EPERM (Windows) | `npm run dev` mengunci DLL | hentikan dev server, ulangi |
| Email tidak terkirim | `RESEND_API_KEY` kosong/salah, domain belum verified | Vercel env; dashboard Resend → Logs |
| Email ke admin@snapfit.id tak masuk | routing email cPanel | cPanel → Email Routing → *Local Mail Exchanger* |
| Sitemap kosong | query paralel menghabiskan koneksi DB | pertahankan satu query di `listLandingPages` |
| Skor PageSpeed turun | skrip/library baru di layout | lihat [08](08-performa-seo.md) |
| `cdn.snapfit.id` tak bisa dibuka dari rumah | DNS ISP / propagasi | cek via DoH ([07](07-infrastruktur.md#dns-di-cloudflare)) |

## Pekerjaan yang masih tertunda

- **±29 Sep 2026 — tahap 2 CDN**: setelah `cdn.snapfit.id` bisa dibuka langsung dari
  koneksi rumah, tambahkan `/^cdn\.snapfit\.id$/` ke `DIRECT` di `lib/image-loader.ts`,
  deploy, **baru** jalankan `mirror-marketplace-images.mjs --upload` lalu `--rewrite`.
  Urutan penting — kalau terbalik, kuota *Image Optimization* Vercel jebol.
- Go-live Midtrans & Biteship saat akun terverifikasi ([05](05-pembayaran-pengiriman.md)).
- Aktifkan `ADMIN_REQUIRE_MFA=true` ([09](09-keamanan.md)).
- Roll kunci yang pernah tertempel di chat (R2, Resend); hapus token R2 lama.
- GA4: tandai `purchase` sebagai *Key event* setelah ada pesanan pertama tercatat.
