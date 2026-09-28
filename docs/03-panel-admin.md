# 03 — Panel admin

Alamat: **https://www.snapfit.id/admin** — wajib login dengan akun ber-role `admin`
(dan MFA bila `ADMIN_REQUIRE_MFA=true`). Lihat [09](09-keamanan.md).

## Menu

Menu samping dikelompokkan (`components/admin/admin-nav.tsx`): **Dashboard** ·
**Penjualan** (Pesanan, Keranjang Ditinggal, Voucher, Diskon) · **Katalog** (Semua Produk,
Tambah Produk, Edit Massal, Impor CSV, Impor Ginee, Unggulan, Kategori, Merek) ·
**Tampilan Toko** (Banner, Menu Header, Linktree) · **Pelanggan** (Ulasan, Pencarian).
Grup bisa dibuka/tutup; grup halaman aktif selalu terbuka; pilihan diingat di browser.

| Menu | URL | Untuk apa |
|---|---|---|
| Dashboard | `/admin` | Omzet, pesanan, produk terjual, pelanggan (bandingkan periode sebelumnya) |
| Keranjang Ditinggal | `/admin/keranjang` | Checkout yang belum jadi pesanan + tombol WA siap kirim; statistik 30 hari |
| Pencarian | `/admin/pencarian` | Kata kunci terpopuler & pencarian tanpa hasil (90 hari) |
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
| Ongkir per Provinsi | `/admin/ongkir` | Tarif 1 kg pertama + per kg berikutnya + estimasi untuk 38 provinsi; isi cepat per pulau |
| Voucher | `/admin/voucher` | Kode voucher: potongan harga atau gratis ongkir, minimal belanja, batas manfaat, **Bisa digabung** (potongan + gratis ongkir) |
| Ulasan | `/admin/ulasan` | Setujui/tolak ulasan pembeli (di atas, kuning) + tambah ulasan manual |
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

### Mengatur ongkir per provinsi
**Penjualan → Ongkir per Provinsi**: isi tarif **1 kg pertama** + **per kg berikutnya** (berat
dibulatkan ke atas per kg, min. 1 kg) + estimasi. Pakai **Isi cepat per pulau** lalu sesuaikan
provinsi tertentu. Kosongkan = tarif flat. Hapus centang **Dilayani** untuk provinsi tanpa kurir
(pembeli tak bisa checkout ke sana). Gratis ongkir lewat voucher `GRATISONGKIR` (Admin → Voucher). Keranjang
menulis "ongkir mulai RpX" (cache 5 menit).

### Menyiapkan promo Payday / Tanggal Kembar
1. **Penjualan → Diskon** → isi persen, pilih varian.
2. Pilih **Kampanye** → tanggal Mulai/Selesai **terisi otomatis** dengan jadwal berikutnya
   (mis. Tanggal Kembar → 10 Okt 00:00–23:59 WIB); bisa diubah.
3. Simpan. Status di daftar: *terjadwal* → *berjalan* → *berakhir* — harga diskon aktif &
   berhenti otomatis sesuai jadwal, halaman `/promo/...` ikut berganti tampilan.

Diskon tanpa kampanye tetap berlaku di seluruh toko seperti biasa (kini juga bisa dijadwalkan).

### Moderasi ulasan pembeli
Ulasan dari pembeli muncul paling atas di **Ulasan** dengan label "Menunggu persetujuan".
**Setujui** → tampil di halaman produk. **Tolak** → dihapus beserta fotonya. Ulasan negatif
yang jujur sebaiknya tetap disetujui (menambah kepercayaan) — tolak hanya spam/kasar/tak
relevan. Balas keluhan lewat WhatsApp pembeli dari menu Pesanan.

### Membaca data pencarian
**Pencarian → Tidak ada hasil** = produk/tipe yang dicari pembeli tapi belum ada atau
stoknya kosong. Gunakan untuk memutuskan restock di Ginee atau impor produk baru.
Kolom "sekarang N hasil" menunjukkan hasil pada pencarian terakhir — bila sudah
ada hasil, berarti produknya sudah tersedia. Klik kata kunci untuk mencoba
pencarian itu di toko.

### Agar rekomendasi "Lengkapi dengan" akurat
- Tulis **tipe HP** di opsi varian secara konsisten antar produk (case & tempered glass),
  mis. selalu "iPhone 18 Pro Max" / "Z Fold 8 Ultra". Variasi kecil seperti "Fold8 Ultra"
  atau "(Wide)" sudah disamakan otomatis, tapi salah ketik ("Pivacy") atau tipe yang
  berbeda nama tidak.
- Awali nama produk dengan jenisnya ("… Case …", "… Tempered Glass …", "… Lens Protector …").

### Menambah foto produk
- Klik area foto lalu pilih file, **atau tempel (Ctrl+V)** gambar yang disalin dari
  Shopee/web lain — langsung diunggah.
- Semua foto dikompres ke WebP (maks 1200px) dan disimpan di `cdn.snapfit.id` (R2).
- Foto yang tidak dipakai lagi (di produk, varian, banner, kategori, ulasan, maupun
  linktree) dihapus otomatis dari storage saat data disimpan/dihapus
  (`cleanupOrphanImages` di `lib/upload/cleanup.ts`).

### Impor dari Ginee
1. **Impor Ginee** → cari nama produk → centang → Impor.
   Produk dengan **stok gudang 0 disembunyikan** secara default (centang "Sembunyikan stok 0" untuk
   mengubah); "Centang semua" & Impor hanya berlaku untuk produk yang terlihat.
2. Diproses 3 produk per langkah (ada progress bar); stok diambil dari gudang,
   merek ditebak dari judul (`lib/brand-guess.ts`), foto disalin ke `cdn.snapfit.id`.
3. **Nama sama digabung**: Ginee kadang punya banyak master produk bernama persis sama (mis. 23×, masing-
   masing 1 varian). Halaman impor menyatukannya jadi 1 baris ("gabungan N produk Ginee") → diimpor
   sebagai 1 produk dengan semua varian. `gineeProductId` = master pertama; stok tetap per SKU.
4. Periksa hasilnya: harga dummy (99.999 dst.) harus diganti manual di form produk.

### Mengunci produk dari sinkron Ginee
Di form produk, aktifkan **"Kunci dari sinkron"** bila stok/harga produk itu ingin
diatur manual — sinkron harian akan melewatinya.

### Harga
Harga web **dikelola manual** (keputusan 26 Sep 2026). Sinkron Ginee hanya mengisi
harga yang masih dummy, dari harga jual toko Shopee "Snapfit Indonesia".
