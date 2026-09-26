# 02 — Design System & UI/UX

## Arah estetika: condong ke Nomad, JAUHI gaya marketplace

Snapfit single-brand → tiru **kelapangan Nomad Goods**, bukan kepadatan marketplace
(UniTAG/Shopee). Prinsip:

- Banyak ruang kosong (whitespace)
- Foto produk jadi bintang (besar)
- Teks minimal tapi tegas
- Palet warna sedikit

Ini yang bikin barang Rp50–150rb terasa worth it.

## Token (atur di `styles/globals.css`)

Semua kustomisasi terjadi lewat CSS variables shadcn. Set sekali, semua komponen ikut.

- **Warna:** 1 primary brand + netral (hitam/putih/abu). Maks 2 warna aksen.
  `--primary`, `--background`, `--foreground`, `--accent`, `--muted`.
- **Tipografi:** Geist untuk judul + body (atau 1 font display + 1 body). Font tepat =
  50% kesan premium.
- **Radius:** satu nilai konsisten, misal `--radius: 0.5rem`.
- **Spacing:** skala jarak konsisten (jangan angka acak).

> Aturan: ganti tema cukup dari satu file. Tidak ada warna/ukuran yang di-hardcode di komponen.

## Responsive — FULL responsive, mobile prioritas utama (jangan kebalik)

Wajib jalan mulus di 3 ukuran. Mayoritas traffic dari HP → **desain & bangun mobile DULU**,
baru tablet, baru desktop.

| Breakpoint | Lebar | Status |
|-----------|-------|---------|
| Mobile | 375px | **PRIORITAS UTAMA** |
| Tablet | 768px | Penting — Snapfit jual case iPad/tablet |
| Desktop | 1280px | |

Perlakukan tiap ukuran secara sadar (layout, jumlah kolom, target sentuh), jangan cuma
"desktop yang diciutin". Tes tiap halaman di ketiga ukuran sebelum dianggap selesai.

- **Sticky bottom bar di mobile** untuk tombol "Tambah ke Keranjang".
  Pakai `pb-[calc(4.5rem+env(safe-area-inset-bottom))]` biar aman di iPhone.
- **Tablet:** grid 2 kolom, target sentuh besar, foto lega.

## Interaksi dinamis (AJAX) — tanpa reload halaman

Toko harus terasa seperti app: aksi user meng-update sebagian layar tanpa muat ulang penuh.
Terapkan AJAX (fetch ke Route Handler / Server Action) di interaksi ini:

- **Filter tipe HP, sort, "load more"** di listing → produk berubah tanpa reload.
- **Ganti varian di PDP** → foto & harga berganti seketika, tanpa reload.
- **Tambah ke keranjang** → badge keranjang naik seketika (optimistic UI), tanpa pindah halaman.
- **Ubah qty / hapus** di keranjang → subtotal update langsung.
- **Cek ongkir** di checkout → tarif muncul tanpa reload.
- **Search produk** → hasil muncul saat mengetik (debounce).

Muat AWAL halaman tetap RSC (cepat + SEO). Pembagian teknis RSC vs AJAX: `01-arsitektur.md`.

## UX paling kritis: selektor tipe device

Case iPhone 15 ≠ 16, tempered glass Samsung ≠ iPhone. Pembeli harus **gampang & yakin**
memilih yang cocok dengan HP-nya. Kalau cuma satu hal UX yang diperfeksiin, ini prioritasnya.

- Flow **"Pilih tipe HP kamu"** jelas di homepage / sebagai filter utama.
- Di PDP, tampilkan kompatibilitas dengan tegas.
- Tujuan: kurangi salah beli → kurangi retur → review bagus.

## Halaman kunci (urut prioritas)

### Product Detail Page (PDP) — paling penting, di sini duit masuk
- Galeri foto besar (kiri desktop / atas mobile)
- **Selektor varian dengan foto per-varian** — ganti warna/model, foto ikut ganti
- Harga + tombol "Tambah ke Keranjang" menonjol
- **Trust badges:** "Garansi Resmi", "100% Original", "7 Hari Pengembalian"
- Estimasi ongkir inline (Biteship)
- "Mungkin kamu butuhkan" — produk terkait

### Homepage
- Hero banner (dikelola dari admin)
- Etalase/kategori — berbasis tipe device
- Produk unggulan
- Strip "brand story" singkat (keunggulan single-brand)

### Listing/kategori
- Grid produk + filter tipe HP + sort

### Cart & Checkout
- Langkah sesedikit mungkin

## Alur kerja desain

Design bukan folder terpisah — dia **tahap sebelum koding**:
**tentukan token → mock halaman kunci → baru bikin komponen.**
Mulai dari PDP (halaman paling berpengaruh).
