# 02 — Fitur toko (halaman publik)

Semua halaman toko ada di `app/(shop)/` dan memakai layout bersama
(`app/(shop)/layout.tsx`): header + mega menu, footer, drawer keranjang, modal login,
bar bawah (HP), dan tombol WhatsApp melayang.

## Peta halaman

| URL | Isi | File utama |
|---|---|---|
| `/` | Banner carousel, kategori, produk unggulan/terbaru, popup promo | `app/(shop)/page.tsx` |
| `/produk` | Semua produk: filter merek/perangkat/model, urutkan, cari, muat lagi | `components/shop/product-listing.tsx` |
| `/produk/[slug]` | Detail produk (PDP) | `components/shop/pdp-view.tsx` |
| `/kategori/[slug]` | Landing SEO per kategori (mis. iPhone 17 Series) | `lib/seo-pages.ts`, `landing-view.tsx` |
| `/merek/[slug]` | Landing SEO per merek (Ringke, VRS Design, …) | idem |
| `/keranjang`, `/checkout` | Keranjang & checkout (tanpa wajib login) | `checkout-view.tsx` |
| `/keranjang?pulih=…` | Memulihkan keranjang dari tautan email/WA pengingat | `cart-restore.tsx` |
| `/berhenti` | Berhenti menerima email pengingat keranjang | |
| `/checkout/sukses` | Terima kasih + instruksi transfer + opt-in Google Customer Reviews | |
| `/lacak` | Lacak pesanan: nomor pesanan + email/HP → status, resi | `track-order.tsx`, `lib/actions/track.ts` |
| `/akun`, `/akun/pesanan` | Profil & riwayat pesanan (login) | |
| `/bantuan` | FAQ, cara pesan, pengiriman, retur, kontak | |
| `/grosir` | Penawaran grosir/deadstock via WhatsApp | `app/grosir/page.tsx` |
| `/links` | Linktree SNAPFIT (diatur dari admin) | `app/links/page.tsx` |
| `/masuk`, `/daftar` | Login/daftar (email + Google) | `components/auth/*` |

## Perilaku penting

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
- Tautan ke halaman merek & kategori; ulasan pelanggan; voucher yang berlaku.

### Keranjang & checkout
- Keranjang disimpan di `localStorage` — bertahan walau browser ditutup.
- Voucher & diskon dihitung ulang di server saat checkout (harga dari klien tidak dipercaya).
- Setelah pesan: email instruksi transfer ke pembeli + email notifikasi ke admin.
  Detail: [05](05-pembayaran-pengiriman.md).

- **Isi otomatis untuk pelanggan lama**: setelah pesanan berhasil, kontak & alamat
  disimpan di `localStorage` perangkat pembeli (`snapfit.checkout.contact`) — tidak
  di server. Checkout berikutnya terisi otomatis, dengan tombol "Bukan kamu? Hapus"
  untuk perangkat bersama.

### Pencarian
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
