# 08 — Performa & SEO

## Skor saat ini (PageSpeed/Lighthouse **mobile**, 27 Sep 2026)

| Halaman | Performa | Aksesibilitas | Best practices | SEO |
|---|---|---|---|---|
| Beranda | 95–96 | 100 | 100 | 100 |
| Daftar produk `/produk` | 94–96 | 100 | 100 | 100 |
| Detail produk | 90 | 100 | 100 | 100 |
| Landing kategori/merek | 99 | 100 | 100 | 100* |

\* Landing tanpa produk ber-stok sengaja `noindex` (SEO "diblokir" di Lighthouse itu wajar).

Ukur ulang secara lokal (API PageSpeed publik sering kehabisan kuota):

```bash
npx lighthouse@12 https://www.snapfit.id/ --only-categories=performance --chrome-flags="--headless=new" --view
```

Jangan menjalankan Lighthouse bersamaan dengan build/tugas berat lain — skor anjlok
karena CPU direbut.

## Kenapa skornya bisa tinggi — aturan yang harus dijaga

Lighthouse mobile mensimulasikan HP lambat (4G pelan, CPU 4× lebih lambat). Dalam
simulasi itu **setiap KB JavaScript yang dimuat sebelum konten tampil menunda LCP**.
Aturan berikut lahir dari pengukuran nyata:

1. **Jangan impor library berat di komponen yang ada di layout toko.**
   Header, footer, keranjang, modal login ada di *setiap* halaman.
   - Status login dibaca dari **cookie**, bukan `supabase-js` (±55KB gzip).
   - `supabase-js` untuk login Google di-`import()` saat tombol diklik.
   - `radix-ui` wajib lewat `optimizePackageImports` (sudah di `next.config.mjs`).
   Cek ukuran setelah `npm run build`: kolom **First Load JS** halaman toko
   harus ±130–155 kB. Bila melonjak, cari impor baru yang berat.
2. **Skrip pihak ketiga (analitik, chat, widget) wajib ditunda.** Pakai
   `useDeferredLoad()` (`components/tracking/use-deferred-load.ts`): dimuat saat
   interaksi pertama atau 5 detik. gtag (±170KB) + fbevents (±190KB) dulu menurunkan
   skor ±10 poin dan menambah TBT ±250ms.
3. **Gambar LCP diberi prioritas**: banner pertama `priority` + `fetchPriority="high"`,
   4 kartu produk teratas `priority`. Yang lain lazy.
4. **Jangan munculkan popup/modal saat load** — elemen besar yang muncul belakangan
   menjadi LCP. Popup promo menunggu scroll/15 detik.
5. **Tanpa `experimental.inlineCss`**: CSS (±80KB) terkirim dua kali per halaman &
   tak ter-cache. File CSS eksternal lebih baik untuk kunjungan berulang.
6. **Foto selalu lewat `@/components/ui/image`** dengan `sizes` yang benar agar HP
   tidak mengunduh versi desktop.
7. **Rekomendasi/data tambahan di PDP dihitung di server saat ISR**, dikirim ringkas
   (1 opsi per tipe, bukan semua varian) — "Lengkapi dengan" menambah ±1 kB JS & ±1,4 kB HTML.
8. **Aksesibilitas**: teks oranye kecil pakai `text-brand-ink` (kontras ≥ 4,5:1),
   bukan `text-brand`; urutan heading runtut (h1 → h2 → h3); tombol ikon wajib
   `aria-label`; drawer/modal tertutup memakai `inert`.

## Gambar

Lihat [07 — Gambar & kuota Vercel](07-infrastruktur.md#gambar--kuota-vercel).

## SEO

| Hal | Di mana |
|---|---|
| Judul & deskripsi global: "SNAPFIT Indonesia - Aksesoris Gadget Premium", template `%s \| SNAPFIT Indonesia` | `app/layout.tsx` |
| Gambar Open Graph | `app/opengraph-image.png` |
| Sitemap (produk, kategori, merek, halaman statis) | `app/sitemap.ts` → `/sitemap.xml` |
| robots | `app/robots.ts` (admin, API, checkout, keranjang, akun & halaman login diblokir) |
| Data terstruktur | Beranda: `WebSite` + `OnlineStore`; PDP: `Product` (harga, stok, rating); landing: `CollectionPage` + `ItemList` + `BreadcrumbList` |
| Canonical | tiap halaman publik |
| Landing SEO | `/kategori/[slug]` & `/merek/[slug]` — `noindex` otomatis bila 0 produk |

Sitemap sudah didaftarkan di Google Search Console. Sitemap dibangun dengan **satu
query** — jangan diubah menjadi puluhan query paralel (pool koneksi DB habis →
sitemap kosong di Vercel).
