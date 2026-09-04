# 05 — Pengiriman (Biteship)

## Model biaya

- **Tanpa biaya setup / bulanan.** Ongkir dibayar pembeli saat checkout.
- Biteship agregator kurir (JNE, J&T, SiCepat, dll) dalam satu API.
- (Alternatif yang sempat dipertimbangkan: RajaOngkir. Biteship dipilih karena API lebih
  modern + dukung ordering/label, bukan cuma cek tarif.)

## Fungsi yang dipakai

1. **Cek tarif (rates)** — di halaman PDP (estimasi) dan checkout (final).
   Input: origin (gudang Snapfit), destination (alamat pembeli), berat & dimensi paket.
2. **Buat order pengiriman** — setelah pembayaran `PAID`, generate order kurir + resi.
3. **Tracking** — tampilkan status resi ke pembeli (opsional tahap awal).

## Alur checkout

```
Pembeli isi alamat
   → Biteship rates (pilih kurir + layanan)
   → shippingCost masuk ke total order
   → bayar (Midtrans)
   → setelah PAID: Biteship create order → simpan trackingNo di Order
```

## Data yang harus disiapkan

- **Alamat origin** (gudang/toko) — konstanta di env/config.
- **Berat & dimensi per produk/varian** — WAJIB akurat, ongkir salah = rugi.
  Simpan di model Variant (tambah field `weight`, `length`, `width`, `height` bila perlu).

## Catatan

- Untuk aksesori (ringan & kecil), berat volumetrik jarang jadi masalah — tapi tetap isi
  berat asli tiap item biar tarif akurat.
- Cache hasil rates sebentar (per kombinasi origin-destination-berat) biar hemat request
  dan checkout terasa cepat.

## Env

```
BITESHIP_API_KEY=...
ORIGIN_POSTAL_CODE=...
ORIGIN_AREA_ID=...
```
