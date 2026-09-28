# 02 — Fitur toko (halaman publik)

Semua halaman toko ada di `app/(shop)/` dan memakai layout bersama
(`app/(shop)/layout.tsx`): header + mega menu, footer, drawer keranjang, modal login,
bar bawah (HP), dan tombol WhatsApp melayang.

## Peta halaman

| URL | Isi | File utama |
|---|---|---|
| `/` | Beranda bercerita (bagian dari Admin → Konten Beranda), popup promo | `app/(shop)/page.tsx`, `components/home/` |
| `/produk` | Semua produk: filter merek/perangkat/model, urutkan, cari, muat lagi | `components/shop/product-listing.tsx` |
| `/produk/[slug]` | Detail produk (PDP) | `components/shop/pdp-view.tsx` |
| `/kategori/[slug]` | Landing SEO per kategori (mis. iPhone 17 Series) | `lib/seo-pages.ts`, `landing-view.tsx` |
| `/merek/[slug]` | Landing SEO per merek (Ringke, VRS Design, …) | idem |
| `/keranjang`, `/checkout` | Keranjang & checkout (tanpa wajib login) | `checkout-view.tsx` |
| `/keranjang?pulih=…` | Memulihkan keranjang dari tautan email/WA pengingat | `cart-restore.tsx` |
| `/ulasan/[token]` | Form ulasan pembeli (tautan dari email/WA ajakan ulas) | `review-form.tsx`, `app/api/ulasan` |
| `/berhenti` | Berhenti menerima email pengingat keranjang | |
| `/checkout/sukses` | Terima kasih + instruksi transfer + opt-in Google Customer Reviews | |
| `/lacak` | Lacak pesanan: nomor pesanan + email/HP → status, resi | `track-order.tsx`, `lib/actions/track.ts` |
| `/akun`, `/akun/pesanan` | Profil & riwayat pesanan (login) | |
| `/bantuan` | FAQ, cara pesan, pengiriman, retur, kontak | |
| `/promo/payday-sale`, `/promo/tanggal-kembar` | Halaman kampanye: produk berdiskon, hitung mundur, voucher | `app/(shop)/promo/[slug]`, `lib/campaigns.ts` |
| `/grosir` | Penawaran grosir/deadstock via WhatsApp | `app/grosir/page.tsx` |
| `/links` | Linktree SNAPFIT (diatur dari admin) | `app/links/page.tsx` |
| `/masuk`, `/daftar` | Login/daftar (email + Google) | `components/auth/*` |

## Perilaku penting

### Beranda (bercerita, gaya Nomad) — sejak 28 Sep 2026
- Toko **satu merek (SNAPFIT)**. Beranda disusun dari bagian yang diatur di **Admin → Konten Beranda**
  (JSON di `SiteSetting` `home.sections`; skema & isi bawaan: `lib/home/sections.ts`; data: `lib/home/data.ts`;
  tampilan: `components/home/`). Jenis: hero, deretan produk, pintasan kategori, gambar+teks bergantian,
  kutipan, banner cerita, komunitas, banner ulasan, kartu info.
- **Lebar gabungan**: hero, banner cerita, komunitas & banner ulasan selebar layar; sisanya max-w-6xl.
- Hero pertama mode foto bertema gelap = **persis Nomad** (diukur dari nomadgoods.com): mulai dari paling atas layar
  di belakang bilah pengumuman (jadi transparan via `html:has([data-hero-overlay])`) & header kapsul (hampir selebar
  layar, 70px, radius 25px); tinggi 90vh (95svh HP); teks sejajar kolom isi 1600px (tepi 40px): badge biru #005bd3 → subjudul atas
  33px → judul 77px extrabold tracking −4% → tombol pil putih 48px. HP: teks tengah di atas. Tinggi bilah = CSS
  `--announce-h`/`--nav-h` (styles/globals.css) — SAMAKAN bila header diubah.
- Hero mode **foto** (bawaan): foto selebar layar + versi HP (`<picture>`, hanya satu yang diunduh), tema
  terang/gelap (teks gelap + gradasi warna latar / teks putih + gradasi hitam), **parallax** (`components/home/parallax.tsx`;
  mati bila "kurangi gerakan"). Foto bawaan = SEMENTARA, disusun dari foto varian produk (latar dibuat transparan,
  2400×1350 & 1080×1350) sampai client punya foto lifestyle. Mode **produk** = latar warna + foto produk di samping.
- Isi bawaan (`DEFAULT_SECTIONS`) tidak ikut di-cache — hanya konten tersimpan dari admin yang di-cache (`lib/home/data.ts`).
- Komunitas (foto ulasan, min. 3) & banner ulasan (`{jumlah}`/`{rating}` asli) **tersembunyi otomatis** bila belum ada data.
- Foto lebar diunggah via `ImageInput wide` → maks 2400px, nama `-wide.webp`, varian 750/1200/1800 (`lib/image-loader.ts`).
- Halaman `/merek/<selain snapfit>` → redirect permanen ke `/produk`; filter Merek disembunyikan bila <2 merek.

### Stok & harga yang tampil
- Stok berasal dari **gudang Ginee** (sinkron harian 11:00 WIB) — lihat [06](06-integrasi.md#ginee).
- Varian berharga dummy (99.999 / 999.999 / 9.999.999) dianggap **stok 0** dan tidak
  bisa dibeli; produk yang semua variannya habis tidak tampil di daftar.
- Produk yang dihapus di Ginee otomatis **diarsipkan** → hilang dari toko (PDP 404).

### Detail produk (PDP)
- Pilih varian (warna/tipe) → foto & harga berganti tanpa reload.
- Urutan: galeri → varian & tombol beli → **deskripsi di bawahnya** (agar varian
  terlihat tanpa scroll).
- Tombol "Tanya stok / tipe HP via WhatsApp" (tercatat sebagai event *Contact*).
- **"Lengkapi dengan"** di bawah tombol beli: case ↔ pelindung layar / pelindung kamera
  untuk **tipe HP varian terpilih** (`lib/cross-sell.ts`, `lib/product-kind.ts`).
  - Jenis produk = kata kunci **paling awal** di nama ("Case … Include Tempered Glass" = case).
  - Tipe dicocokkan lewat kunci ternormalisasi ("Z Fold 8 (Wide)" = "Fold8 Wide"); opsi tanpa
    angka (warna) tak dicocokkan. Tak ada yang cocok persis → bagian ini tidak tampil.
  - 1 varian cocok → tombol **Tambah** (langsung ke keranjang); lebih → **Pilih** membuka
    produknya dengan varian tipe itu terpilih (`?varian=<id>`, dibaca di client agar PDP tetap ISR).
  - Dihitung di server saat ISR (cache 5 menit), maks 3 item tampil.
- Tautan ke halaman merek & kategori; ulasan pelanggan; voucher yang berlaku.

### Keranjang & checkout
- Keranjang disimpan di `localStorage` — bertahan walau browser ditutup.
- Voucher & diskon dihitung ulang di server saat checkout (harga dari klien tidak dipercaya).
- **Voucher tersedia** tampil di ringkasan checkout (`voucher-picker.tsx`): bisa dipakai → "Hemat RpX" +
  tombol Pakai (terbaik diberi label "Paling hemat"); belum memenuhi syarat → "Belanja RpX lagi" +
  progres + tautan tambah produk; tak bermanfaat (mis. gratis ongkir padahal ongkir sudah gratis) → keterangan.
  Syarat dihitung dengan `computeVoucherBenefit` yang sama dengan server.
- **Gabung voucher** (`lib/voucher.ts` → `canCombine`): maks. 2 voucher per pesanan, satu **potongan** +
  satu **gratis ongkir**, dan keduanya harus dicentang *Bisa digabung* di admin. Voucher sejenis tak pernah
  digabung — memilih yang lain menampilkan tombol **Ganti** dan keterangan "X dilepas". Server
  (`createOrder`) memeriksa ulang dan menolak kombinasi terlarang; kode tersimpan di `Order.voucherCodes`
  (mis. `SNAP20K+GRATISONGKIR`) dan tampil di email pesanan.
- **Alamat:** dropdown Provinsi → Kabupaten/Kota → Kecamatan (`region-select.tsx`, data resmi Kepmendagri
  di `public/wilayah/<kode>.json`, 38 prov · 514 kab/kota · 7.285 kec; diunduh per provinsi ±2–5 KB).
  Kode wilayah divalidasi server (hierarki harus konsisten); pesanan menyimpan kode + nama
  (ikut ke email & Ginee). Kode pos tetap diketik.
- **Ongkir per provinsi** (mode flat): `quoteShipping` di server menghitung dari provinsi + berat
  (`lib/shipping-zone.ts`) — fungsi yang sama dipakai `createOrder`. Provinsi tanpa tarif = flat.
  Sebelum provinsi dipilih, ringkasan menulis "Pilih provinsi" & total belum termasuk ongkir.
- Gratis ongkir lewat voucher `GRATISONGKIR` (daftar Voucher tersedia di checkout; maks. Rp20.000).
  Mode gratis ongkir otomatis (`FREE_SHIPPING_MIN` > 0) masih ada di kode tapi dimatikan.
- Provinsi tidak dilayani → pesan "belum ada kurir" & tombol pesan nonaktif.
- Setelah pesan: email instruksi transfer ke pembeli + email notifikasi ke admin.
  Detail: [05](05-pembayaran-pengiriman.md).

- **Isi otomatis untuk pelanggan lama**: setelah pesanan berhasil, kontak & alamat
  disimpan di `localStorage` perangkat pembeli (`snapfit.checkout.contact`) — tidak
  di server. Checkout berikutnya terisi otomatis, dengan tombol "Bukan kamu? Hapus"
  untuk perangkat bersama.

### Halaman promo (Payday & Tanggal Kembar)
- Produk = diskon di **Admin → Diskon** yang diberi label kampanye. Tiga keadaan:
  1. **Berjalan** (diskon aktif) → produk berharga promo + hitung mundur ke berakhirnya.
  2. **Terjadwal** (diskon mulai nanti) → "bocoran" produk (harga masih normal) + hitung mundur ke mulai.
  3. **Belum ada diskon** → jadwal kalender berikutnya + produk unggulan (halaman tak pernah kosong).
- Jadwal kalender (`lib/campaigns.ts`, WIB): Payday tgl 25–28;
  tanggal kembar 1.1 … 12.12 (sehari penuh). Voucher aktif ikut tampil (tombol salin).
- Link di Menu Header (Payday Sale 🔥, Tanggal Kembar) diatur di **Tampilan Toko → Menu Header**.

### Ulasan pembeli
- Email ajakan ulas (7 hari setelah dikirim) & tombol **WA: ajak ulas** di admin berisi
  tautan `/ulasan/<token>` — token acak per pesanan = bukti pembelian, tanpa login.
- Pembeli memberi bintang, komentar, nama tampil (default nama depan + inisial), foto
  opsional (diperkecil di browser → WebP di R2). Satu ulasan per produk per pesanan;
  hanya pesanan berstatus Dikirim/Selesai.
- Ulasan masuk sebagai **menunggu persetujuan** — tampil di PDP (badge "Pembeli
  terverifikasi" + foto) setelah disetujui admin. Rata-rata bintang & data Google hanya
  menghitung ulasan yang disetujui.

### Pencarian
- **Per kata, bukan frasa utuh** (`searchTerms` di `lib/actions/product.ts`): "snapfit s26" = produk yang
  mengandung "snapfit" DAN "s26" di nama, merek, atau nama/tipe varian (urutan kata bebas, maks. 6 kata).
- Kata kunci di `/produk` dicatat (teragregasi, tanpa data pribadi) setelah stabil
  2 detik dan hasilnya termuat — hanya bila tidak ada filter lain aktif, agar "0 hasil"
  memang karena kata kuncinya. Ketikan parsial & saran cepat di header tidak dicatat.
  Lihat di **Admin → Pencarian**.

### Keranjang ditinggal
- Saat pembeli mengisi **email atau nomor HP** di checkout, isi keranjang + kontak
  disimpan sebagai draf (`CheckoutDraft`, 1,5 detik setelah berhenti mengetik).
- Belum memesan setelah 1 jam (maks. 3 hari) → **email pengingat sekali** (cron 20:00
  WIB) berisi produk & tombol "Lanjutkan Belanja" → `/keranjang?pulih=<token>`
  mengisi ulang keranjang dengan produk yang masih tersedia.
- Pembeli yang hanya mengisi HP muncul di **Admin → Keranjang Ditinggal** untuk
  di-follow-up via WhatsApp.
- Membuat pesanan dengan email/HP yang sama → draf otomatis ditutup.
- Tautan "Berhenti" di email → `/berhenti` (perlu klik konfirmasi).
- Draf lebih tua dari 60 hari dihapus otomatis oleh cron (retensi data).

### WhatsApp
- Nomor toko: **+62 816-4806-156**, satu sumber di `lib/contact.ts`
  (atau env `NEXT_PUBLIC_STORE_WA`).
- Tombol melayang disembunyikan di `/checkout` dan PDP (PDP punya tombol sendiri).

### Popup promo
- Muncul setelah scroll > 300px **atau** 15 detik — sengaja tidak saat halaman dimuat
  (dulu menjadi elemen LCP & menurunkan skor PageSpeed).

### Lacak pesanan
- Wajib nomor pesanan **dan** email/HP yang cocok; dibatasi 10 percobaan/menit per IP.
- Hanya menampilkan nama depan & kota (tanpa alamat lengkap).
- Email "dikemas" & "dikirim" berisi tautan langsung ke `/lacak?order=…`.

### Linktree (`/links`)
- Profil (foto, bio, ikon sosial), tombol link, dan **pemisah bagian**.
- Latar: default / warna / gradien / gambar; teks terang/gelap.
- Klik dihitung lewat `/links/go/[id]` lalu diarahkan; opsi "buka di tab baru" per tombol.

## Halaman 404
- `components/shop/not-found-content.tsx`: pencarian produk, tautan beranda/semua produk, pintasan merek,
  WhatsApp & lacak pesanan. Tanpa query DB; popup promo tidak tampil (`data-no-popup`).
- URL tak dikenal → `app/(shop)/[...missing]` → 404 dengan header & footer toko; `app/not-found.tsx` = cadangan.
- **Jangan taruh `loading.tsx` di atas halaman yang memanggil `notFound()`** (mis. `/produk/[slug]`): streaming
  membuat status terkirim 200 (soft 404). Skeleton daftar produk ada di grup `produk/(daftar)/` karena alasan ini.
