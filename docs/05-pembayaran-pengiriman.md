# 05 — Pembayaran, ongkir & email pesanan

Mode diatur lewat env — ganti env di Vercel lalu deploy ulang, tanpa ubah kode
(`lib/payment.ts`).

| Env | Default | Nilai lain |
|---|---|---|
| `PAYMENT_MODE` | `manual` (transfer bank) | `midtrans` |
| `SHIPPING_MODE` | `flat` | `biteship` |
| `SHIPPING_FLAT_COST` | `5000` | rupiah |
| `FREE_SHIPPING_MIN` | `150000` | rupiah; `0` = tanpa gratis ongkir otomatis |
| `MANUAL_BANK_NAME` / `_NUMBER` / `_HOLDER` | rekening BCA toko | |

## Mode aktif sekarang: transfer manual + ongkir flat

1. Pembeli checkout → pesanan `PENDING`.
2. Halaman sukses & email **"Selesaikan pembayaran"** menampilkan rekening + total.
3. Admin menerima email **"🛒 Pesanan baru"** (ke `ADMIN_NOTIFY_EMAIL`, default
   `admin@snapfit.id`; bisa beberapa alamat dipisah koma).
4. Belum bayar setelah 2 jam → cron mengirim **pengingat** sekali (maks. 3 hari).
5. Admin cek mutasi → **Konfirmasi lunas** di `/admin/pesanan` → `PAID`:
   stok berkurang, pesanan didorong ke Ginee, email konfirmasi ke pembeli.

## Go-live Midtrans (saat akun terverifikasi)

1. Pastikan env produksi terisi: `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`,
   `MIDTRANS_IS_PRODUCTION=true`.
2. Di dashboard Midtrans, set **Payment Notification URL**:
   `https://www.snapfit.id/api/midtrans/webhook`.
3. Set `PAYMENT_MODE=midtrans`, deploy.
4. Uji satu transaksi kecil; cek status berubah `PAID` otomatis (webhook memverifikasi
   signature SHA-512 lalu menjalankan alur yang sama dengan konfirmasi manual).

## Go-live Biteship (ongkir real-time)

1. Env: `BITESHIP_API_KEY`, `ORIGIN_POSTAL_CODE` (kode pos gudang).
2. Set `SHIPPING_MODE=biteship`, deploy.
3. Tarif diambil dari `/api/shipping/rates` saat pembeli mengisi alamat. Tanpa API key,
   modul memakai tarif tiruan (mock) — aman untuk lokal.

## Email transaksional

Dikirim lewat **Resend** (domain `snapfit.id` terverifikasi, region Tokyo).
Pengirim `SNAPFIT Indonesia <no-reply@snapfit.id>`, balasan ke `admin@snapfit.id`.
Template di `lib/email.ts` (header oranye + logo, gaya mirip Shopee).

| Email | Pemicu | Penerima |
|---|---|---|
| Selesaikan pembayaran | pesanan dibuat (mode manual) | pembeli |
| Pesanan baru | pesanan dibuat | admin |
| Pengingat pembayaran | cron 19:00 WIB, PENDING 2 jam–3 hari | pembeli |
| Pembayaran berhasil | → `PAID` | pembeli |
| Sedang dikemas | → `PROCESSING` | pembeli (+ tautan lacak) |
| Sudah dikirim | → `SHIPPED` + resi | pembeli (+ tautan lacak) |
| Ajakan ulasan | cron 10:00 WIB, 7 hari setelah dikirim | pembeli (tautan ke form `/ulasan/<token>`) |
| Keranjang masih menunggu | cron 20:00 WIB, checkout tak selesai 1 jam–3 hari | calon pembeli (kecuali yang minta berhenti) |

Tanpa `RESEND_API_KEY` email hanya dicatat di log (`[email:mock]`) — aman untuk lokal.
