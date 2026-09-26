# SNAPFIT Indonesia — www.snapfit.id

Toko online resmi SNAPFIT (aksesoris gadget premium: case HP, tablet & AirPods —
authorized reseller Ringke, VRS Design, Araree, Supcase). Satu proyek Next.js berisi
storefront, panel admin, API, dan tugas terjadwal.

| | |
|---|---|
| **Produksi** | https://www.snapfit.id (Vercel, tim `mandimalems-projects`) |
| **Repo** | github.com/mandimalem/snapfit (branch `main`) |
| **Stack** | Next.js 15 (App Router) · React 19 · Tailwind 4 · Prisma 6 · Supabase (Postgres + Auth) |
| **Aset foto** | Cloudflare R2 → `cdn.snapfit.id` |
| **Stok** | Sinkron harian dari Ginee (gudang) |

## Mulai cepat (lokal)

Butuh Node 20+ dan file `.env` (minta salinan; **jangan pernah di-commit**).

```bash
npm install
```

```bash
npm run dev
```

Buka http://localhost:3000 — admin di http://localhost:3000/admin.

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi (jalankan sebelum deploy untuk cek error) |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run lint` | ESLint |
| `npx prisma db push` | Terapkan perubahan `prisma/schema.prisma` ke database (hentikan `npm run dev` dulu di Windows) |
| `npx prisma studio` | Lihat/ubah isi database lewat browser |

## Deploy

Deploy **manual lewat Vercel CLI** (auto-deploy GitHub tidak andal):

```bash
npx vercel deploy --prod --yes
```

Butuh env `VERCEL_TOKEN`. Detail & jebakan: [docs/07-infrastruktur.md](docs/07-infrastruktur.md#deploy).

## Dokumentasi

Semua ada di [`docs/`](docs/README.md):

1. [Arsitektur & struktur kode](docs/01-arsitektur.md)
2. [Fitur toko (halaman publik)](docs/02-fitur-toko.md)
3. [Panel admin](docs/03-panel-admin.md)
4. [Database & aturan data](docs/04-database.md)
5. [Pembayaran, ongkir & email pesanan](docs/05-pembayaran-pengiriman.md)
6. [Integrasi: Ginee, Google, Meta](docs/06-integrasi.md)
7. [Infrastruktur, env & deploy](docs/07-infrastruktur.md)
8. [Performa & SEO](docs/08-performa-seo.md)
9. [Keamanan](docs/09-keamanan.md)
10. [Operasional & troubleshooting](docs/10-operasional.md)
