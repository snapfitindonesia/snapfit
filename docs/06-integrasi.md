# 06 — Integrasi

## Ginee

Klien OpenAPI di `lib/ginee/` (tanda tangan HMAC-SHA256, `client.ts`). Env:
`GINEE_ACCESS_KEY`, `GINEE_SECRET_KEY` (+ opsional `GINEE_WAREHOUSE_ID`,
`GINEE_PRICE_SHOP_NAME`, `GINEE_PRICE_CHANNEL`, `GINEE_SYNC_PRICE`).

### Sinkron stok harian (`lib/ginee/sync.ts`)
Cron `/api/cron/ginee-stock` tiap **11:00 WIB** (±30 detik):

1. **Stok** diambil dari **inventori gudang** (`/openapi/warehouse-inventory/v1/sku/list`,
   50 SKU per permintaan). Stok di master produk Ginee selalu 0 — jangan dipakai.
2. **Harga** — env `GINEE_SYNC_PRICE`:
   - `placeholder` *(default, dipakai sekarang)*: hanya mengganti harga web yang masih
     dummy dengan harga jual toko Shopee **"Snapfit Indonesia"**.
   - `all`: menimpa semua harga dari Shopee (tidak dipakai — harga dikelola manual).
   - `false`: harga tidak disentuh.
3. **Arsip otomatis**: tiap `gineeProductId` dicek; bila Ginee menjawab
   `DATA_NOT_EXISTED` → produk diarsipkan; muncul lagi → dipulihkan. Bila > 30% produk
   "hilang" sekaligus, dianggap gangguan API dan arsip dibatalkan.
4. Produk dengan `syncLocked` dilewati.

Jalankan manual: buka `/api/cron/ginee-stock` dengan header
`Authorization: Bearer <CRON_SECRET>`.

### Impor produk (`lib/actions/ginee.ts`)
Lihat [03 — Impor dari Ginee](03-panel-admin.md#impor-dari-ginee). Harga per varian
diambil dari `/openapi/product/variation/v1/list-price` (kanal toko Shopee Snapfit);
bila tak ada harga wajar → 0 dan harus diisi manual.

### Push pesanan (`lib/ginee/orders.ts`)
Pesanan yang lunas dikirim ke Ginee sebagai pesanan manual (toko
`GINEE_MANUAL_SHOP_ID`) agar stok marketplace ikut berkurang.

> Akun Ginee terhubung ke beberapa toko (Primary…, Toko Cares…). Acuan harga selalu
> toko Shopee "Snapfit Indonesia".

## Feed produk (Google & Meta)

`https://www.snapfit.id/feed/products.xml` — RSS 2.0 dengan namespace `g:`
(format Google Merchant Center), cache 1 jam (`app/feed/products.xml/route.ts`).

- Satu item per **varian**, dikelompokkan dengan `item_group_id`.
- Varian harga dummy & produk diarsipkan tidak dimasukkan.
- Foto cover dimasukkan sebagai `additional_image_link` pertama.

Dipakai oleh:
| Platform | ID | Catatan |
|---|---|---|
| Google Merchant Center | 5859428306 | Feed terjadwal dari URL di atas |
| Meta Commerce (katalog) | — | Sumber data = URL feed, format Google Merchant Center; terhubung ke Pixel |

## Google Analytics 4

`components/tracking/google-analytics.tsx`, ID `G-H34K2TJPJP` (env `NEXT_PUBLIC_GA_ID`).
Event e-commerce dari `lib/tracking.ts`: `view_item`, `add_to_cart`, `begin_checkout`,
`purchase`, `contact_whatsapp`. Page view dikirim tiap pindah halaman.

## Meta Pixel + Conversions API

- Pixel browser: `components/tracking/facebook-pixel.tsx` (ID `1401485358664588`).
- CAPI server: `/api/fb-capi` → `lib/fb-capi.ts` (token `FB_CAPI_ACCESS_TOKEN`, **rahasia**).
- Setiap event dikirim ke keduanya dengan `event_id` sama → Meta membuang duplikat.
  `Purchase` memakai ID tetap `purchase_<nomor pesanan>`.
- Email/HP pembeli dikirim ter-hash (advanced matching) hanya di event checkout/purchase.
- Uji event: isi `FB_CAPI_TEST_CODE` lalu lihat *Test Events* di Events Manager.

> gtag.js & fbevents.js **dimuat tertunda** (interaksi pertama / 5 detik) demi
> PageSpeed; event yang terjadi sebelumnya diantrekan, tidak hilang. Lihat [08](08-performa-seo.md).

## Google Customer Reviews

`components/tracking/google-customer-reviews.tsx` — pop-up opt-in di halaman sukses,
hanya untuk pesanan PAID ke atas, sekali per pesanan (estimasi tiba +5 hari).
Merchant ID `5859428306`. Add-on *Customer Reviews* harus aktif di Merchant Center.

## Resend (email)

Lihat [05 — Email transaksional](05-pembayaran-pengiriman.md#email-transaksional).
