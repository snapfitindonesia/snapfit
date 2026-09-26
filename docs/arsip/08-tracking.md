# 08 — Tracking & Notifikasi

## Tracking: GTM + Meta Pixel + GA4

Tujuan: **retargeting** + ukur traffic & konversi dari awal. Pasang sejak launch, jangan nanti.

- **GTM (Google Tag Manager)** = satu container untuk mengatur semua tag. Pasang GTM,
  lalu Meta Pixel & GA4 dikelola dari dalam GTM (tidak tanam script satu-satu).
- **Meta Pixel** = untuk retargeting iklan Facebook/Instagram (relevan dengan pekerjaan
  ads-mu). Event kunci: `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`.
- **GA4** = analitik traffic & perilaku.

## Pasang tanpa bikin lemot

Load via `next/script` dengan strategy `afterInteractive` supaya tidak menahan render awal —
ini sering jadi biang lambat kalau salah pasang.

```tsx
import Script from "next/script";

<Script id="gtm" strategy="afterInteractive">
  {`(function(w,d,s,l,i){ ... })(window,document,'script','dataLayer','GTM-XXXXXX');`}
</Script>
```

## Event e-commerce (dataLayer)

Kirim event ke `dataLayer` di titik-titik ini, lalu map ke Pixel/GA4 di GTM:

| Aksi | Event |
|------|-------|
| Buka PDP | `view_item` / `ViewContent` |
| Tambah ke keranjang | `add_to_cart` / `AddToCart` |
| Mulai checkout | `begin_checkout` / `InitiateCheckout` |
| Bayar sukses | `purchase` / `Purchase` (kirim value + order id) |

`purchase` idealnya di-fire setelah status `PAID` (dari halaman sukses / setelah webhook),
biar tidak double-count.

## Notifikasi order: EMAIL saja

Keputusan: notifikasi via **email**, bukan WhatsApp (WA API dianggap mahal).

- Kirim email setelah order `PAID` (konfirmasi) dan saat `SHIPPED` (resi).
- Opsi layanan: Resend / Nodemailer (SMTP hosting) / Supabase. Resend cocok untuk Next.js
  (API bersih, ada free tier).
- Template: konfirmasi order, detail item, total, alamat, estimasi kirim.

## Env

```
NEXT_PUBLIC_GTM_ID=GTM-XXXXXX
RESEND_API_KEY=...        # atau SMTP_* kalau pakai email hosting
```
