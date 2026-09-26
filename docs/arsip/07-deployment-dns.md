# 07 — Deployment, DNS & Hybrid CDN

## Model hybrid (pola UniTAG)

| Bagian | Ditangani oleh | Domain |
|--------|----------------|--------|
| App Next.js (storefront + admin) | **Vercel** | `snapfit.id`, `www` |
| Aset gambar (produk, banner) | **Hosting cPanel lama** | `cdn.snapfit.id` |

Alasan: hosting cPanel lemot untuk app dinamis, tapi **cepat untuk file statis** —
dan server-nya di Indonesia = latency rendah untuk pembeli lokal. Jadi hosting yang sudah
dibayar tetap kepakai, bukan mubazir.

> **Wajib diingat:** Vercel filesystem ephemeral — gambar yang di-upload admin TIDAK bisa
> ke folder `public/`. Harus ke storage eksternal. Dua opsi:
> - **Hemat (pakai yang ada):** upload ke hosting cPanel via endpoint upload kecil / SFTP.
> - **Simpel & rapi:** Supabase Storage (API bersih, nyatu dengan DB). Trade-off: nambah
>   egress Supabase.

## DNS: JANGAN migrasi NS ke Vercel

Ada dua cara pasang domain ke Vercel. Untuk kasus hybrid ini, pilih cara kedua.

**Cara 1 — Migrasi NS ke Vercel** ❌ (tidak disarankan): DNS Vercel basic, hilang
fleksibilitas, tidak bisa taruh Cloudflare di depan.

**Cara 2 — Cukup tambah DNS record** ✅ (NS tetap di registrar / pindah ke Cloudflare):

| Record | Host | Nilai |
|--------|------|-------|
| A | `@` (apex `snapfit.id`) | IP Vercel (ikuti yang ditampilkan dashboard, mis. `76.76.21.21`) |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME/A | `cdn` | arahkan ke hosting cPanel |

Kecepatan app **sama saja** entah NS di mana — yang penting apex/www menunjuk ke Vercel.
Vercel tetap otomatis terbitkan SSL + CDN + DDoS mitigation.

## ⚠️ Jaga email — MX record

Kalau ada email bisnis di hosting (mis. `admin@snapfit.id`), migrasi NS ke Vercel akan
**memutus email** kecuali MX record ikut dipindah. Ini jebakan paling sering.
Dengan Cara 2 (NS tidak pindah ke Vercel), email aman.

## Opsi Cloudflare (untuk security dari doc 06)

Kalau mau WAF/Bot Fight gratis: pindahkan NS ke **Cloudflare (gratis)** — bukan Vercel.
Di Cloudflare: apex/www → Vercel, `cdn` → hosting, MX → hosting. Dapat 1 dashboard DNS +
opsi security, hybrid tetap jalan.

- Awal: set record **DNS-only** dulu (abu-abu) biar simpel.
- Nanti: proxy Vercel lewat Cloudflare (oranye) → set SSL mode **Full**, sadar ada CDN ganda.

## `next.config` untuk gambar CDN

Daftarkan domain CDN supaya `next/image` boleh optimasi:

```js
images: {
  remotePatterns: [
    { protocol: 'https', hostname: 'cdn.snapfit.id' },
    // atau kalau pakai Supabase Storage:
    // { protocol: 'https', hostname: '<project>.supabase.co' },
  ],
}
```

## Performa (biar cepat seperti referensi)

- **RSC default**, `"use client"` hanya di komponen interaktif (cart, tombol qty).
- **`next/image` untuk semua gambar** — auto-webp, lazy, srcset responsif.
- **ISR / cache** halaman produk: `export const revalidate = 3600`.
- **Tunda script tracking** (`next/script` strategy `afterInteractive`) — lihat `08-tracking.md`.
