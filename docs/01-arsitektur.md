# 01 — Arsitektur

## Gambaran besar

Satu proyek **Next.js 15 (App Router)** berisi semuanya — tidak ada server backend
terpisah:

```
Browser ──► Vercel (Next.js)
             ├─ Halaman toko (RSC + ISR)          app/(shop)/…
             ├─ Panel admin (dinamis, login)       app/admin/…
             ├─ Server Actions (mutasi)            lib/actions/…
             ├─ Route handler (API/feed/cron)      app/api/…, app/feed/…
             └─ Cron harian (vercel.json)          app/api/cron/…
                 │
                 ├──► Supabase Postgres (Prisma)   data toko
                 ├──► Supabase Auth                login pelanggan & admin
                 ├──► Cloudflare R2                foto (cdn.snapfit.id) + backup DB
                 ├──► Ginee OpenAPI                stok gudang, impor produk, push pesanan
                 ├──► Resend                       email transaksional
                 └──► Meta CAPI / GA4 / GCR        tracking & ulasan
```

## Stack

| Lapisan | Pilihan | Catatan |
|---|---|---|
| Framework | Next.js 15.5, React 19 | **Jangan** naik ke Next 16 tanpa uji penuh |
| Styling | Tailwind CSS 4 + `tw-animate-css` | Token di `styles/globals.css`, brand monokrom |
| Komponen UI | shadcn (hanya `Button`) + komponen sendiri | `radix-ui` di-tree-shake via `optimizePackageImports` |
| Database | Postgres (Supabase) via **Prisma 6** | Jangan naik ke Prisma 7 tanpa migrasi |
| Auth | Supabase Auth (`@supabase/ssr`) | Cookie sesi; admin = role di `app_metadata` |
| Gambar | `next/image` lewat `@/components/ui/image` | Wajib — lihat [08](08-performa-seo.md#gambar) |
| Rate limit | Upstash Redis | `lib/security/ratelimit.ts` |

## Struktur folder

```
app/
  (shop)/            halaman toko (layout: header, footer, keranjang, WA melayang)
    page.tsx           beranda
    produk/            daftar produk & detail (/produk/[slug])
    kategori/[slug]    landing SEO per kategori
    merek/[slug]       landing SEO per merek
    keranjang/ checkout/ lacak/ akun/ bantuan/ privacy/ terms/
  admin/             panel admin (dilindungi middleware + MFA)
  api/               route handler: upload, produk (AJAX), ongkir, webhook, cron, CAPI
  feed/products.xml  feed produk untuk Google Merchant Center & Meta
  links/             halaman linktree (/links)
  grosir/            halaman penawaran grosir
  masuk/ daftar/ lupa-password/ reset-password/ auth/callback
  sitemap.ts robots.ts layout.tsx (metadata global, tracking)
components/
  shop/              komponen storefront
  admin/             komponen panel admin
  auth/              form login/daftar/MFA
  tracking/          GA4, Meta Pixel, Customer Reviews, pemuat tertunda
  ui/                Button + Image (wrapper next/image)
lib/
  actions/           Server Actions per domain (product, order, admin, ginee, linktree, track, voucher, auth)
  ginee/             klien OpenAPI Ginee (HMAC), sinkron stok, impor, push pesanan
  upload/            kompres WebP + upload R2, mirror foto marketplace, pembersihan
  security/          rate limit, Turnstile
  supabase/          klien server/browser/admin + middleware sesi
  validations/       skema zod
  email.ts           template & pengiriman email (Resend)
  backup.ts          ekspor DB → R2 (cron)
  price-guard.ts     aturan harga dummy (99.999 dst.)
  contact.ts         nomor WhatsApp toko (satu sumber)
  slug.ts            slugify / productSlug / skuify / link merek
  image-loader.ts    loader langsung untuk foto marketplace
prisma/schema.prisma model data
scripts/             skrip CLI perawatan (lihat 10-operasional)
middleware.ts        refresh sesi Supabase + gerbang /admin
vercel.json          jadwal cron
```

## Pola data & interaksi

| Kebutuhan | Teknik | Contoh |
|---|---|---|
| Muat awal halaman toko | **Server Component + ISR** (`revalidate = 300`) | beranda, PDP, landing kategori/merek |
| Filter/sort/cari/muat lagi | Client component `fetch()` ke `/api/products` | `components/shop/product-listing.tsx` |
| Keranjang | Client state + `localStorage` (`CartProvider`) | tanpa login, tanpa reload |
| Mutasi (checkout, admin CRUD) | **Server Actions** di `lib/actions/*` | `createOrder`, `saveProduct` |
| Status login di header | Dibaca dari cookie sesi (tanpa supabase-js) | `StoreUIProvider` |
| Integrasi terjadwal | Cron Vercel harian → route `app/api/cron/*` | stok Ginee, backup, email |

### Cache & kesegaran data

- Halaman toko di-cache ISR 5 menit; setelah admin menyimpan produk/banner, action
  memanggil `revalidatePath` sehingga perubahan tampil segera.
- PDP & landing memakai `generateStaticParams() { return [] }` + ISR on-demand: tidak
  dibangun saat build, dibuat saat pertama dibuka lalu di-cache.
- Feed produk di-cache 1 jam, sitemap 1 jam.
- Admin selalu dinamis (tanpa cache).

## Aturan lintas-kode

1. **Gambar**: selalu `import Image from "@/components/ui/image"`, bukan `next/image`
   langsung — wrapper ini memilih loader yang hemat kuota Vercel.
2. **Harga dummy**: selalu lewat `isPlaceholderPrice` / `sellableStock`
   (`lib/price-guard.ts`); jangan membuat ambang harga sendiri.
3. **Produk diarsipkan** (`archived: true`) wajib dikecualikan di semua query toko,
   feed, sitemap, dan landing.
4. **Nomor WA** hanya dari `lib/contact.ts` (`STORE_WA`, `waChatUrl`).
5. **Skrip pihak ketiga** baru harus ditunda (lihat [08](08-performa-seo.md)).
6. Server Action yang mengubah data wajib memanggil `requireAdmin()` (admin) atau
   memvalidasi input dengan zod (publik).
