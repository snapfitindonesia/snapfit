# 03 — Panel admin

Alamat: **https://www.snapfit.id/admin** — wajib login dengan akun ber-role `admin`
(dan MFA bila `ADMIN_REQUIRE_MFA=true`). Lihat [09](09-keamanan.md).

## Menu

| Menu | URL | Untuk apa |
|---|---|---|
| Dashboard | `/admin` | Omzet, pesanan, produk terjual, pelanggan (bandingkan periode sebelumnya) |
| Keranjang Ditinggal | `/admin/keranjang` | Checkout yang belum jadi pesanan + tombol WA siap kirim; statistik 30 hari |
| Pesanan | `/admin/pesanan` | Konfirmasi transfer, isi resi, ubah status, kirim WA ke pembeli |
| Produk | `/admin/produk` | Daftar, cari, ubah, hapus (satuan/massal); badge "Diarsipkan" |
| Produk baru / ubah | `/admin/produk/baru`, `/admin/produk/[id]` | Form lengkap: foto, varian, harga, stok, merek, kategori |
| Edit massal | `/admin/produk/edit-massal` | Ubah harga/stok banyak varian via CSV |
| Impor CSV | `/admin/produk/impor` | Tambah banyak produk dari CSV |
| Impor Ginee | `/admin/ginee/impor` | Cari produk di Ginee → impor siap jual (lihat bawah) |
| Kategori | `/admin/kategori` | Pohon kategori (Brand › Seri › Model) + gambar |
| Merek | `/admin/merek` | Daftar merek (Ringke, VRS Design, …) |
| Menu | `/admin/menu` | Tautan menu header |
| Banner | `/admin/banner` | Banner carousel beranda & promo |
| Unggulan | `/admin/unggulan` | Produk yang ditonjolkan di beranda |
| Diskon | `/admin/diskon` | Diskon persen untuk varian terpilih, dengan periode mulai–selesai |
| Voucher | `/admin/voucher` | Kode voucher: potongan harga atau gratis ongkir, minimal belanja, batas manfaat |
| Ulasan | `/admin/ulasan` | Moderasi ulasan pelanggan |
| Linktree | `/admin/linktree` | Isi halaman `/links`: profil, latar, tombol, pemisah |
| MFA | `/admin/mfa` | Daftarkan/verifikasi aplikasi authenticator |

## Tugas sehari-hari

### Memproses pesanan transfer manual
1. Email "Pesanan baru" masuk ke `admin@snapfit.id`.
2. Cek mutasi BCA. Bila dana masuk → **Pesanan → Konfirmasi lunas**.
   Ini mengurangi stok, mendorong pesanan ke Ginee, dan mengirim email konfirmasi.
3. Setelah dikemas → status **Diproses** (email "dikemas" ke pembeli).
4. Isi **nomor resi** → status **Dikirim** (email berisi resi + tautan lacak).
5. Tombol WhatsApp di tiap pesanan membuka chat ke pembeli dengan pesan siap kirim.

Pembeli yang belum bayar setelah 2 jam otomatis dikirimi pengingat (sekali).

### Follow-up keranjang ditinggal
**Keranjang Ditinggal** menampilkan pembeli yang mengisi kontak di checkout tapi belum
memesan (14 hari terakhir). Yang punya email sudah dikirimi pengingat otomatis
(badge "Email terkirim"); badge "Tautan dibuka" = pembeli sudah mengklik tautan
pemulihan. Tombol **Chat WhatsApp** membuka pesan siap kirim berisi produk & tautan
pemulihan keranjang. Statistik "Lewat pengingat" = pesanan dari pembeli yang
membuka tautan pemulihan.

### Menambah foto produk
- Klik area foto lalu pilih file, **atau tempel (Ctrl+V)** gambar yang disalin dari
  Shopee/web lain — langsung diunggah.
- Semua foto dikompres ke WebP (maks 1200px) dan disimpan di `cdn.snapfit.id` (R2).
- Foto yang tidak dipakai lagi (di produk, varian, banner, kategori, ulasan, maupun
  linktree) dihapus otomatis dari storage saat data disimpan/dihapus
  (`cleanupOrphanImages` di `lib/upload/cleanup.ts`).

### Impor dari Ginee
1. **Impor Ginee** → cari nama produk → centang → Impor.
2. Diproses 3 produk per langkah (ada progress bar); stok diambil dari gudang,
   merek ditebak dari judul (`lib/brand-guess.ts`), foto disalin ke `cdn.snapfit.id`.
3. Periksa hasilnya: harga dummy (99.999 dst.) harus diganti manual di form produk.

### Mengunci produk dari sinkron Ginee
Di form produk, aktifkan **"Kunci dari sinkron"** bila stok/harga produk itu ingin
diatur manual — sinkron harian akan melewatinya.

### Harga
Harga web **dikelola manual** (keputusan 26 Sep 2026). Sinkron Ginee hanya mengisi
harga yang masih dummy, dari harga jual toko Shopee "Snapfit Indonesia".
