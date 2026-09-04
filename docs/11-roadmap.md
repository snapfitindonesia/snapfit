# 11 — Roadmap Eksekusi (untuk Claude Code)

Urutan membangun dari nol sampai launch. **Satu tahap = satu sesi** Claude Code.
Tiap tahap: buka sesi baru, kasih file docs yang relevan sebagai konteks, tempel
perintahnya, review hasilnya, baru lanjut tahap berikutnya.

> Prinsip: jangan lompat. Tiap tahap berdiri di atas yang sebelumnya. Kalau satu tahap
> belum beres/rapi, jangan lanjut.
>
> **Dua syarat LINTAS-TAHAP (berlaku di semua tampilan/UI):**
> 1. **Full responsive, mobile prioritas utama** (375 → tablet 768 → desktop 1280) — `02-design-system.md`.
> 2. **Interaksi dinamis AJAX tanpa reload** (filter, keranjang, search, ongkir) — `01-arsitektur.md`.
>
> Muat awal halaman tetap RSC (cepat + SEO); interaksi user pakai AJAX. Sebutkan dua syarat
> ini di tiap sesi yang menyentuh UI.

---

## Tahap 0 — Fondasi proyek
**Docs:** `01-arsitektur.md`
**Tujuan:** proyek jalan di localhost, struktur folder benar, belum ada fitur.

```
Baca docs/01-arsitektur.md. Buat proyek Next.js 15 (App Router) + TypeScript + Tailwind CSS
+ shadcn/ui. Ikuti struktur folder di dokumen itu persis (app/(shop), app/admin, app/api,
components/ui, components/shop, lib/actions, lib/validations, prisma, styles).
Belum bikin fitur apa pun — cukup fondasi yang bisa `npm run dev` dan tampil halaman kosong.
Pasang juga Prisma (belum bikin model). Konfirmasi dulu rencananya sebelum eksekusi.
```

---

## Tahap 1 — Design system
**Docs:** `02-design-system.md`
**Tujuan:** token warna/font/spacing terpasang, layout shell (header, footer, bottom nav mobile).

```
Baca docs/02-design-system.md. Setup design system di styles/globals.css: token warna
(1 primary + netral), font Geist via next/font, radius & spacing konsisten — semua sebagai
CSS variables shadcn. Lalu bikin layout shell storefront: header, footer, dan sticky bottom
bar di mobile (pakai safe-area). Arah rasa: single-brand premium ala Nomad (lapang, minimal).
Belum ada data produk — pakai placeholder.
```

---

## Tahap 2 — Database
**Docs:** `03-database.md`
**Tujuan:** schema Prisma + migration awal, pakai SQLite dulu (dev lokal).

```
Baca docs/03-database.md. Buat prisma/schema.prisma sesuai model di dokumen (Product,
Variant, Category, Banner, Discount, Voucher, Order, OrderItem). Datasource SQLite untuk dev.
Harga sebagai integer (rupiah). Jalankan migration awal + bikin seed data contoh (beberapa
produk + varian) biar bisa dites. Jangan pakai fitur khusus Postgres yang tak jalan di SQLite.
```

---

## Tahap 3 — Produk & PDP (halaman paling penting)
**Docs:** `02-design-system.md`, `03-database.md`
**Tujuan:** listing produk + halaman detail dengan selektor varian.

```
Baca docs/01-arsitektur.md, docs/02-design-system.md, docs/03-database.md. Bikin:
1) Halaman listing/kategori: muat awal produk via RSC (cepat + SEO), TAPI filter tipe HP,
   sort, dan "load more" jalan via AJAX (fetch ke Route Handler) TANPA reload halaman.
2) Halaman detail produk (PDP) app/(shop)/produk/[slug]: galeri foto, VariantPicker dengan
   foto per-varian (ganti varian → foto & harga ganti seketika tanpa reload), trust badges
   (Garansi Resmi / 100% Original / 7 Hari Pengembalian), tombol Tambah ke Keranjang (AJAX +
   optimistic, badge keranjang naik seketika), section "Mungkin kamu butuhkan".
Full responsive, MOBILE prioritas utama, lalu tablet & desktop — tes di ketiga ukuran.
```

---

## Tahap 4 — Keranjang
**Docs:** `03-database.md`
**Tujuan:** tambah/ubah/hapus item, hitung subtotal.

```
Baca docs/03-database.md dan docs/01-arsitektur.md. Bikin keranjang belanja: tambah item dari
PDP, ubah qty, hapus — semua meng-update subtotal LANGSUNG tanpa reload (AJAX + optimistic UI).
Simpan state keranjang (client state + persist sederhana). Halaman app/(shop)/keranjang, full
responsive mobile-utama. Belum checkout — cukup sampai review isi keranjang.
```

---

## Tahap 5 — Checkout + Payment + Ongkir
**Docs:** `04-payment-gateway.md`, `05-pengiriman.md`, `03-database.md`
**Tujuan:** alur bayar lengkap dengan Midtrans (sandbox) + ongkir Biteship.

```
Baca docs/04-payment-gateway.md, docs/05-pengiriman.md, docs/03-database.md. Bikin alur
checkout: form alamat → cek ongkir Biteship via AJAX (tarif muncul tanpa reload, pilih kurir)
→ buat Order (status PENDING, total dihitung ULANG di server) → Midtrans Snap (mode Sandbox)
→ webhook app/api/midtrans yang memverifikasi signature dan update status order. Setelah PAID,
buat order pengiriman Biteship & simpan resi. Jangan percaya harga/total dari client. Pakai
Server Actions untuk mutasi. Full responsive, mobile utama.
```

---

## Tahap 6 — Auth & Security
**Docs:** `06-auth-security.md`
**Tujuan:** login pakai Supabase Auth + proteksi anti-bruteforce.

```
Baca docs/06-auth-security.md. Integrasikan Supabase Auth untuk login/daftar customer dan
login admin. Pasang: Cloudflare Turnstile di form login, middleware rate-limit (Upstash) yang
HANYA membatasi route login (pakai kode di dokumen), error message generic, dan MFA wajib
untuk admin. Lindungi semua route app/admin — harus login + role admin. Prisma tetap untuk
data; auth diserahkan ke Supabase.
```

---

## Tahap 7 — Dashboard Admin
**Docs:** `09-dashboard-admin.md`, `03-database.md`, `06-auth-security.md`
**Tujuan:** panel kelola toko.

```
Baca docs/09-dashboard-admin.md, docs/03-database.md, docs/06-auth-security.md. Bikin panel
admin di app/admin (terproteksi): kelola banner (MAIN/ETALASE/PROMO), CRUD produk + varian
(upload foto cover produk & 1 foto per varian), halaman diskon massal (pilih banyak produk,
set persen berbeda), voucher + gratis ongkir, proses pesanan (lihat/update status + resi),
dan dashboard performa (omzet, order, terlaris, grafik). Semua tulis via Server Actions +
validasi Zod + cek role admin di server.
```

---

## Tahap 8 — Tracking & Notifikasi
**Docs:** `08-tracking.md`
**Tujuan:** GTM + Pixel + GA4 + email order.

```
Baca docs/08-tracking.md. Pasang GTM via next/script (strategy afterInteractive), lalu
Meta Pixel & GA4 dikelola dari GTM. Kirim event dataLayer: view_item, add_to_cart,
begin_checkout, purchase (fire setelah PAID). Tambahkan notifikasi email order (Resend atau
SMTP hosting): email konfirmasi saat PAID dan email resi saat SHIPPED. Pastikan script tidak
menahan render awal.
```

---

## Tahap 9 — Deploy & Go Live
**Docs:** `07-deployment-dns.md`, `10-biaya.md`
**Tujuan:** live di Vercel + DNS hybrid + pindah ke Postgres.

```
Baca docs/07-deployment-dns.md. Siapkan produksi: pindah datasource Prisma dari SQLite ke
Postgres/Supabase + migration. Konfigurasi next.config images.remotePatterns untuk domain
CDN. Siapkan upload gambar admin ke storage eksternal (CDN hosting / Supabase Storage) — bukan
folder public. Beri instruksi deploy ke Vercel + daftar env yang harus diisi. Untuk DNS &
email, JANGAN migrasi NS ke Vercel — pakai A/CNAME sesuai dokumen. Ubah Midtrans ke Production.
```

---

## Setelah live — checklist manual (kamu, bukan Claude Code)
- [ ] Set DNS: apex A → Vercel, www CNAME → Vercel, cdn → hosting (jaga MX email).
- [ ] Isi semua env di Vercel (Supabase, Midtrans production, Biteship, Upstash, Turnstile, GTM, email).
- [ ] Ganti Midtrans & Turnstile ke key Production.
- [ ] (Opsional) Pasang Cloudflare di depan untuk WAF/Bot Fight.
- [ ] Tes transaksi asli nominal kecil sebelum promosi.
- [ ] Upgrade Supabase ke Pro saat sudah menghasilkan (backup harian).

## Tips per sesi
- Selalu **review & commit** tiap tahap sebelum lanjut (`git commit`).
- Kalau Claude Code mulai ngaco/konteks penuh, **buka sesi baru** dan kasih docs relevan lagi.
- Minta dia **konfirmasi rencana dulu** sebelum eksekusi tahap besar.
