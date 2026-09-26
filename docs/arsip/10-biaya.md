# 10 — Biaya

Domain & hosting sudah dimiliki → Rp0 tambahan (hosting kini berfungsi sebagai CDN aset).
Harga per 2026, kurs acuan ~Rp16,2rb/USD (estimasi, bisa berubah).

## Rincian bulanan

| Komponen | Fungsi | Biaya |
|----------|--------|-------|
| Domain `snapfit.id` | arah ke Vercel | Rp0 (sudah punya) |
| Hosting cPanel | CDN aset `cdn.snapfit.id` | Rp0 (sudah bayar) |
| Vercel | app Next.js | $0 belajar / **$20 komersial** |
| Supabase | database | $0 awal / **$25 produksi** |
| Midtrans | payment | Rp0/bulan (per-transaksi) |
| Biteship | ongkir | Rp0/bulan (dibayar pembeli) |

Sumber: Vercel Hobby $0 (non-komersial) / Pro $20; Supabase Free $0 / Pro $25.

## Dua fase

**Belajar / pra-launch (localhost + dev):** semua tier gratis → **Rp0/bulan**.
Bisa bangun sampai jadi tanpa biaya baru.

**Toko live (komersial):**

- **Hemat maksimal:** Vercel Pro ($20) + Supabase **Free** → **~Rp330rb/bulan**.
  - Risiko: Supabase Free tanpa backup + project pause setelah 1 minggu idle (toko
    ber-traffic tak akan pause, tapi tanpa backup = risiko data order). Trik hybrid bikin
    DB kecil (teks saja, gambar di CDN) → 500MB muat ribuan produk.
- **Produksi aman (disarankan begitu menghasilkan):** Vercel Pro ($20) + Supabase Pro ($25)
  → **~Rp730rb/bulan**. Dapat backup harian, no-pause, support.

## Biaya transaksi Midtrans (variabel, bukan tetap)

Dipotong per order sukses; bisa ditanggung toko atau dibebankan pembeli.
QRIS 0,7% · GoPay 2% · ShopeePay 1,7% · VA Rp4.000 · kartu 2,9%+Rp2.000.
Contoh order ~Rp100rb: QRIS ≈ Rp700, VA = Rp4.000.

## Kapan biaya naik

- **Supabase** naik kalau DB > 8GB atau egress tinggi → arahkan gambar ke CDN hosting
  biar egress Supabase tetap rendah.
- **Vercel** naik kalau bandwidth > 1TB / fungsi > kredit → jarang tercapai toko baru.

## Kesimpulan

Bangun sampai jadi = **Rp0**. Launch komersial = realistis **Rp330rb–730rb/bulan** +
fee transaksi kecil. Pos biaya terbesar yang perlu dijaga: **Supabase** (kelola egress
dengan CDN hybrid).
