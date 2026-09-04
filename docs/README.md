# Snapfit Website — Dokumentasi Proyek

Toko e-commerce single-brand untuk **Snapfit** (aksesori HP/tablet), dibangun sendiri
sebagai proyek belajar web dev. Dokumentasi ini dipecah per-concern supaya rapi dan
gampang diserahkan ke Claude Code satu per satu.

> **Cara pakai:** baca `01-arsitektur.md` dulu untuk gambaran besar, lalu buka file
> sesuai fitur yang lagi dikerjakan. Tiap file berdiri sendiri — bisa dijadikan konteks
> terpisah saat ngoding di Claude Code biar fokus.

## Daftar Dokumen

| File | Isi | Baca saat |
|------|-----|-----------|
| `01-arsitektur.md` | Stack, struktur folder, model fullstack Next.js, deployment | Awal / setup proyek |
| `02-design-system.md` | Arah UI/UX, token warna/font, halaman kunci, responsive | Sebelum bikin komponen |
| `03-database.md` | Model data Prisma (produk, varian, order, banner, voucher, diskon) | Sebelum bikin backend |
| `04-payment-gateway.md` | Integrasi Midtrans Snap, biaya, alur bayar | Fitur checkout |
| `05-pengiriman.md` | Integrasi Biteship, ongkir | Fitur checkout |
| `06-auth-security.md` | Supabase Auth, anti-bruteforce, MFA admin, rate limit | Fitur login/admin |
| `07-deployment-dns.md` | Vercel, setup DNS/NS, hybrid CDN (hosting cPanel), email/MX | Sebelum launch |
| `08-tracking.md` | GTM, Meta Pixel, GA4 | Setelah storefront jadi |
| `09-dashboard-admin.md` | Kebutuhan panel admin (banner, CRUD, diskon, voucher, order) | Fitur admin |
| `10-biaya.md` | Rincian biaya bulanan | Referensi / planning |
| `11-roadmap.md` | Urutan build nol→launch + perintah siap-tempel per sesi | **Mulai ngoding** |

## Prinsip Proyek

- **Tujuan utama: belajar.** Mulai di localhost, bangun bertahap via Claude Code.
- **Single-brand premium** — referensi rasa: Nomad Goods (bukan gaya marketplace).
- **Full responsive, MOBILE PRIORITAS UTAMA** — lalu tablet & desktop; tiap ukuran
  diperlakukan sadar (Snapfit jual case HP + iPad/tablet).
- **Interaksi dinamis (AJAX) tanpa reload** — filter, keranjang, search, load-more, cek
  ongkir update sebagian halaman tanpa muat ulang penuh. Detail: `01-arsitektur.md`.
- **Ringan & cepat (hybrid)** — RSC untuk muat awal (cepat + SEO), AJAX untuk interaksi;
  `next/image` untuk semua gambar.
- **Solo, tanpa tim teknis** — pilih yang simpel & murah dirawat sendiri.

## Stack Ringkas

Next.js 15 (App Router) · Tailwind CSS · shadcn/ui · Prisma · Supabase (Postgres)
· Midtrans Snap · Biteship · deploy di Vercel · hosting cPanel lama sebagai CDN aset.
