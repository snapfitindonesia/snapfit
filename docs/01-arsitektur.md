# 01 — Arsitektur

## Model: fullstack dalam satu proyek

Next.js adalah fullstack framework — **frontend dan backend hidup di satu proyek yang
sama**, dan itu memang cara yang benar. Jangan pisah jadi server backend terpisah.

- **Frontend** = komponen React (`app/.../page.tsx`)
- **Backend** = Server Components + Server Actions + Route Handlers (jalan di server)
- **Database** = Prisma + Supabase Postgres, diakses dari sisi server

Backend "kesembunyi" dari browser karena data ditarik server-side (pola yang sama dipakai
toko referensi UniTAG) — bukan karena server terpisah. Satu repo, satu deploy, satu tagihan.

## Strategi data & interaksi (hybrid RSC + AJAX)

Target: halaman **muat cepat** TAPI interaksi terasa **dinamis tanpa reload** (AJAX).
Bukan pilih salah satu — dibagi per kebutuhan:

| Kebutuhan | Teknik | Reload? |
|-----------|--------|---------|
| Muat awal halaman (home, listing, PDP) | **RSC** (server render) | — (cepat + SEO) |
| Filter tipe HP, sort, "load more", search | **AJAX** → `fetch()` ke Route Handler `app/api/*` dari Client Component | Tidak |
| Tambah/ubah/hapus keranjang | **AJAX** + optimistic UI | Tidak |
| Cek ongkir di checkout | **AJAX** → Route Handler | Tidak |
| Submit order, aksi admin (CRUD, diskon, voucher) | **Server Actions** (mutasi async) | Tidak |

> **Istilah:** "AJAX" di sini = update sebagian halaman tanpa muat ulang penuh, lewat
> `fetch()` ke Route Handler / Server Action — **bukan** XMLHttpRequest/jQuery kuno. Efek
> UX-nya sama (dinamis), tapi cara modern & aman di Next.js.

**Aturan pembagian:**
- **RSC** untuk yang perlu cepat tampil & terindeks Google (konten produk, halaman awal).
- **Client Component + AJAX** untuk yang butuh reaktif tanpa reload (interaksi user).
- **Server Actions** untuk mutasi data (tulis ke DB) — tervalidasi di server.

Jangan jadikan SEMUA halaman client-side (gaya SPA jQuery lama) — itu bikin muat awal lambat
& jelek buat SEO. Hybrid ini yang menjaga dua tujuan sekaligus: **cepat DAN dinamis.**

## Responsive: mobile prioritas utama (wajib)

Desain & bangun **mobile dulu**, baru tablet, baru desktop — bukan sebaliknya.

| Ukuran | Lebar | Status |
|--------|-------|--------|
| Mobile | 375px | **PRIORITAS UTAMA** — mayoritas traffic |
| Tablet | 768px | Penting (Snapfit jual case iPad/tablet) |
| Desktop | 1280px | |

Tiap ukuran diperlakukan sadar (layout, jumlah kolom, target sentuh), bukan sekadar
"desktop yang diciutkan". Detail pola per halaman: `02-design-system.md`.

## Stack final

| Layer | Pilihan |
|-------|---------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS |
| Komponen UI | shadcn/ui (Radix + Tailwind) |
| Font | Geist (via `next/font`) |
| ORM | Prisma |
| Database | SQLite (dev lokal) → Postgres/Supabase (produksi) |
| Auth | Supabase Auth (lihat `06-auth-security.md`) |
| Payment | Midtrans Snap (lihat `04-payment-gateway.md`) |
| Ongkir | Biteship (lihat `05-pengiriman.md`) |
| Hosting app | Vercel |
| CDN aset | Hosting cPanel lama → `cdn.snapfit.id` (lihat `07-deployment-dns.md`) |
| Tracking | GTM + Meta Pixel + GA4 (lihat `08-tracking.md`) |

## Struktur folder

```
snapfit/
├── app/
│   ├── (shop)/              # STOREFRONT: home, produk, keranjang, checkout
│   │   ├── page.tsx         # homepage
│   │   ├── produk/[slug]/   # halaman detail produk (PDP)
│   │   ├── keranjang/
│   │   └── checkout/
│   ├── admin/               # DASHBOARD ADMIN (layout & proteksi terpisah)
│   │   ├── produk/
│   │   ├── banner/
│   │   ├── diskon/
│   │   ├── voucher/
│   │   └── pesanan/
│   └── api/                 # Route Handlers (webhook Midtrans, dll)
├── components/
│   ├── ui/                  # komponen shadcn (Button, Card, Dialog...)
│   └── shop/                # komponen domain (ProductCard, VariantPicker...)
├── lib/
│   ├── db.ts                # koneksi Prisma
│   ├── actions/             # SERVER ACTIONS = logika backend (order, produk, diskon)
│   ├── validations/         # skema Zod
│   ├── midtrans.ts
│   └── biteship.ts
├── prisma/
│   └── schema.prisma        # model data (lihat 03-database.md)
├── styles/
│   └── globals.css          # DESIGN SYSTEM: token warna/font (lihat 02-design-system.md)
└── public/                  # aset STATIS build-time (logo, ikon) — BUKAN upload admin
```

## Pemisahan yang wajib dijaga

1. **`app/(shop)` vs `app/admin`** — beda layout, beda proteksi. Admin butuh auth + MFA.
2. **UI vs logika** — komponen tampilan (`components/`) tidak menyentuh DB langsung.
   Semua logika data di `lib/actions/`.
3. **Design system terpusat** — token warna/font/spacing HANYA di `globals.css`.
   Jangan hardcode warna di komponen.
4. **Upload admin ≠ folder `public/`** — Vercel filesystem ephemeral; gambar yang
   di-upload admin harus ke storage eksternal (lihat `07-deployment-dns.md`).

## Urutan build per fitur

Untuk tiap fitur, kerjakan berurutan (bukan sekaligus):

**Design (token/mock) → Frontend (komponen) → Backend (Server Action + Prisma)**

Contoh fitur "produk": tentukan tampilan PDP → bikin `VariantPicker` & `ProductGallery`
→ bikin `lib/actions/product.ts` + model Prisma yang menyalakannya.
