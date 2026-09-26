# 09 — Dashboard Admin

Panel admin terpisah dari storefront (`app/admin/`), proteksi ketat (auth + MFA, lihat
`06-auth-security.md`). Ini fitur-fitur yang harus ada.

## 1. Kelola Banner
- Banner **utama** (hero homepage)
- Banner **ke etalase** (arah ke kategori/koleksi)
- Banner **ke halaman promo**
- Tiap banner: upload gambar, atur target link, urutan, aktif/nonaktif.

## 2. CRUD Produk + Varian
- Buat/edit/hapus produk.
- **Foto cover di level produk.**
- **Tiap varian punya 1 foto sendiri** (ganti varian → foto ganti di PDP).
- Field varian: nama, SKU, harga, stok, foto, (berat/dimensi untuk ongkir).

## 3. Diskon Massal (halaman khusus)
- Pilih beberapa produk sekaligus.
- Set persen diskon **berbeda per produk**.
- Aktif/nonaktif, opsional jadwal mulai–selesai.

## 4. Voucher & Gratis Ongkir
- Buat voucher: potongan nominal atau **gratis ongkir**.
- Atur min. pembelian & max benefit (mirip struktur voucher di toko referensi).
- Kode voucher, aktif/nonaktif.

## 5. Proses Pesanan
- Lihat daftar order + status (PENDING/PAID/SHIPPED/DONE/CANCELLED).
- Update status, input/lihat resi (dari Biteship).
- Detail order: item, pembeli, alamat, total.

## 6. Dashboard Performa Toko
- Ringkasan: omzet, jumlah order, produk terlaris, order terbaru.
- Grafik penjualan per periode.
- (Data dari tabel Order — bukan tool eksternal.)

## Catatan implementasi
- Semua aksi tulis (create/update/delete) lewat **Server Actions** di `lib/actions/`,
  dengan validasi Zod + cek role admin di server.
- Upload gambar → storage eksternal (CDN hosting / Supabase Storage), simpan URL di DB.
- Jangan percaya input dari client — validasi & hitung ulang di server.
