# 04 — Payment Gateway (Midtrans Snap)

## Kenapa Midtrans Snap

- Setup gratis, **tanpa biaya bulanan** — hanya bayar per transaksi sukses.
- Snap = popup checkout siap pakai (QRIS, VA, e-wallet, kartu) tanpa bikin UI bayar sendiri.
- Dokumentasi bahasa Indonesia, integrasi mudah.

## Biaya per transaksi (per 2026 — bisa berubah, cek halaman resmi)

| Metode | Biaya |
|--------|-------|
| QRIS | 0,7% |
| GoPay | 2% |
| ShopeePay | 1,7% |
| DANA | 1,5% |
| Virtual Account (BCA/BNI/BRI/Mandiri/Permata) | Rp4.000/transaksi |
| Kartu Kredit (Visa/MC) | 2,9% + Rp2.000 |

Sebagian sudah termasuk PPN (QRIS, GoPay, ShopeePay), sebagian belum. Settlement T+1
(transfer bank) / T+2 (kartu). Contoh produk ~Rp100rb: QRIS ≈ Rp700, VA = Rp4.000.

> Keputusan: biaya bisa ditanggung toko atau dibebankan ke pembeli. Untuk aksesori
> margin tipis, pertimbangkan bebankan sebagian ke pembeli / arahkan ke QRIS (termurah).

## Alur integrasi

1. **Server Action `createOrder`** — hitung total di server (jangan percaya harga dari
   client), simpan Order status `PENDING`, generate `midtransOrderId`.
2. **Minta Snap token** — panggil Midtrans Snap API dari server dengan detail order,
   dapat `token`.
3. **Buka popup** — client jalankan `snap.pay(token)` (Snap.js).
4. **Webhook** (`app/api/midtrans/webhook/route.ts`) — Midtrans kirim notifikasi status.
   **Verifikasi signature**, lalu update `paymentStatus` & `status` order. Ini sumber
   kebenaran, BUKAN callback di browser.
5. **Kirim email** konfirmasi setelah `PAID` (lihat `08-tracking.md` untuk notif).

## Kunci keamanan

- **Hitung ulang total di server** sebelum minta token — cegah manipulasi harga.
- **Verifikasi signature webhook** — jangan update order dari callback client.
- Simpan **Server Key** di env (`MIDTRANS_SERVER_KEY`), jangan pernah ke client.
- Pakai environment **Sandbox** dulu saat dev, baru Production saat launch.

## Env yang dibutuhkan

```
MIDTRANS_SERVER_KEY=...
MIDTRANS_CLIENT_KEY=...     # boleh ke client (buat Snap.js)
MIDTRANS_IS_PRODUCTION=false
```
