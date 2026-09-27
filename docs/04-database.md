# 04 — Database & aturan data

Postgres di **Supabase** (project ref `httdykpmkzhmpqldnfhc`), diakses lewat **Prisma 6**.
Skema: `prisma/schema.prisma`. Klien: `lib/db.ts`.

## Model

| Model | Isi | Field penting |
|---|---|---|
| `Product` | Produk | `slug` (unik), `brand` (nama merek), `gineeProductId`, `featured`, `syncLocked`, `archived`, `variantGroups` (JSON opsi Warna/Tipe) |
| `Variant` | Varian per produk | `price` (rupiah, integer), `stock`, `sku`, `color`, `type`, `image` |
| `Category` | Pohon kategori 3 tingkat: brand → seri → model | `parentId` (null = tingkat brand), `slug` |
| `Merek` | Daftar merek aksesori | nama → halaman `/merek/[slug]` |
| `Review` | Ulasan pelanggan | `rating` 1–5, foto opsional, moderasi admin |
| `Banner` | Banner beranda | gambar, tautan, urutan |
| `NavLink` | Menu header | |
| `Discount` | Diskon persen untuk varian tertentu | `percent`, `startAt`/`endAt` |
| `Voucher` | Kode voucher | `type` POTONGAN / GRATIS_ONGKIR, `minPurchase`, `maxBenefit` |
| `Order` / `OrderItem` | Pesanan & isinya | lihat status di bawah |
| `CheckoutDraft` | Checkout belum jadi pesanan (keranjang ditinggal) | `token` (tautan pulihkan), `remindedAt`, `recoveredAt`, `convertedAt` |
| `EmailOptOut` | Email yang minta berhenti pengingat keranjang | |
| `SearchTerm` | Kata kunci pencarian teragregasi | `count`, `zeroCount` (berapa kali 0 hasil), `lastResults` |
| `BioProfile` / `BioLink` | Linktree `/links` | `BioLink.kind` LINK / DIVIDER, `newTab`, `clicks` |

Pengguna (login) disimpan di **Supabase Auth**, bukan di Prisma. Admin ditandai
`app_metadata.role = "admin"`.

## Status pesanan

```
PENDING ──(transfer dikonfirmasi / webhook Midtrans)──► PAID ──► PROCESSING ──► SHIPPED ──► DONE
   └──────────────────────────────► CANCELLED
```

| Field | Diisi saat | Gunanya |
|---|---|---|
| `paymentReminderAt` | pengingat bayar terkirim | cron tidak mengirim dua kali |
| `gineePushedAt`, `gineeOrderSn` | pesanan terkirim ke Ginee | anti-kirim ulang |
| `shippedAt` | status → SHIPPED | ajakan ulasan dikirim 7 hari setelahnya |
| `reviewRequestedAt` | email ajakan ulasan terkirim | anti-kirim ulang |

## Aturan data (penting)

### Harga dummy = varian tak dijual
Marketplace memakai harga "99.999 / 999.999 / 9.999.999" untuk varian kosong.
`lib/price-guard.ts`:

```ts
isPlaceholderPrice(p)  // true bila p <= 0 atau HANYA angka 9 (≥ 5 digit)
sellableStock(v)       // 0 bila harganya dummy, selain itu v.stock
```

Dipakai di daftar produk, PDP, checkout (ditolak), dan feed (dilewati).
**Jangan** memakai ambang nominal (mis. ≥ 900rb) — case premium asli berharga Rp945rb–1,9jt.

### Produk diarsipkan
`archived = true` → tidak tampil di toko, feed, sitemap, landing; PDP 404. Diset
otomatis oleh sinkron Ginee bila produk dihapus di Ginee, dan dipulihkan bila muncul
lagi. Semua query publik **wajib** menyaring `archived: false`.

### Kunci sinkron
`syncLocked = true` → stok & harga produk tidak disentuh sinkron Ginee.

### Merek
Setiap produk punya merek (`brand`). Nama merek dinormalkan (Ringke, SwitchEasy,
MagEasy, …); produk tanpa merek jelas → "SNAPFIT".

## Mengubah skema

1. Edit `prisma/schema.prisma`.
2. **Hentikan `npm run dev`** (Windows mengunci DLL Prisma → error EPERM).
3. `npx prisma db push` — untuk perubahan **aditif** (kolom/model baru, default).
4. Perubahan yang menghapus/mengubah kolom butuh `--accept-data-loss` — **backup dulu**
   dan jalankan sendiri dengan sadar.

## Backup & restore

- Otomatis tiap hari 03:00 WIB → bucket R2 **privat** `snapfit-backup`,
  file `db/snapfit-YYYY-MM-DD.json.gz` (±120KB), disimpan 30 hari (`lib/backup.ts`).
- Mencakup semua tabel Prisma. **Tidak** mencakup akun Supabase Auth & file foto.
- Restore: lihat [10-operasional](10-operasional.md#restore-database).
