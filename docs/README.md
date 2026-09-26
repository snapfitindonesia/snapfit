# Dokumentasi SNAPFIT

Dokumentasi sistem **yang sedang berjalan** di www.snapfit.id. Mulai dari 01 untuk
gambaran besar, lalu buka dokumen sesuai kebutuhan.

| # | Dokumen | Isi | Baca saat |
|---|---|---|---|
| 01 | [Arsitektur](01-arsitektur.md) | Stack, struktur folder, pola data, cache | Pertama kali / sebelum ubah kode |
| 02 | [Fitur toko](02-fitur-toko.md) | Semua halaman publik & perilakunya | Ubah tampilan/alur belanja |
| 03 | [Panel admin](03-panel-admin.md) | Menu admin & cara pakainya | Kelola produk, pesanan, konten |
| 04 | [Database](04-database.md) | Model data & aturan (harga dummy, arsip, backup) | Ubah skema / data |
| 05 | [Pembayaran & pengiriman](05-pembayaran-pengiriman.md) | Transfer manual/Midtrans, ongkir, email pesanan | Checkout, go-live Midtrans/Biteship |
| 06 | [Integrasi](06-integrasi.md) | Ginee, Merchant Center, Meta, GA4, Customer Reviews | Stok, feed, iklan, tracking |
| 07 | [Infrastruktur](07-infrastruktur.md) | Vercel, Cloudflare, R2, cron, env vars, deploy | Deploy / ganti kredensial |
| 08 | [Performa & SEO](08-performa-seo.md) | Aturan agar PageSpeed tetap tinggi, SEO | Tambah fitur/skrip baru |
| 09 | [Keamanan](09-keamanan.md) | Auth, admin, rate limit, rahasia | Ubah login/admin/API |
| 10 | [Operasional](10-operasional.md) | Rutinitas, backup/restore, skrip, troubleshooting | Ada masalah / perawatan rutin |

Dokumen perencanaan lama (sebelum launch) disimpan di [`arsip/`](arsip/README.md) —
**jangan** dijadikan acuan, banyak yang sudah berubah.

## Konvensi

- Bahasa Indonesia untuk dokumen & komentar kode.
- Satu sumber kebenaran per hal: nomor WA di `lib/contact.ts`, aturan harga dummy di
  `lib/price-guard.ts`, slug di `lib/slug.ts`, format rupiah di `lib/format.ts`.
- Rahasia (API key/token) **hanya** di `.env` (lokal) dan Vercel env — tidak pernah di
  kode, commit, chat, atau URL.
