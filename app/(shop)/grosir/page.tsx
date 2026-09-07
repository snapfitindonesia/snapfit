import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Truck,
  Layers,
  TrendingUp,
  Flame,
  Star,
  PackageX,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";
import { CountdownTimer } from "@/components/shop/countdown-timer";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Grosir Deadstock — Case & Pelindung Harga Pabrik | SnapFit",
  description:
    "Cuci gudang deadstock: case & pelindung original (iPhone 11–15, Samsung, dll) harga grosir. Stok terbatas, tidak restock. Cocok reseller & pemakai.",
};

/* ============================================================
   KONFIG PROMO — ganti dengan angka & tanggal ASLI-mu.
   Countdown & harga coret ikut nilai di sini.
   ============================================================ */
const PROMO = {
  discountPercent: 45, // % diskon grosir (untuk anchoring harga coret di hero)
  endsAt: "2026-09-14T23:59:59+07:00", // GANTI: tanggal & jam promo berakhir
  minOrder: 10, // minimal qty untuk harga grosir
  waNumber: "", // GANTI: nomor WA tanpa "+" (mis. "628123456789"). Kosong = tombol ke katalog.
  // Statistik sosial-proof — ISI ANGKA ASLI (jangan karang):
  stats: { terjual: "—", reseller: "—", rating: "—" },
  // Tingkatan harga grosir (contoh — sesuaikan):
  tiers: [
    { qty: "10–49 pcs", label: "Grosir", off: "45%" },
    { qty: "50–99 pcs", label: "Grosir Plus", off: "50%" },
    { qty: "100+ pcs", label: "Distributor", off: "55%" },
  ],
};

// GANTI dengan testimoni ASLI (screenshot chat/marketplace). Ini hanya contoh struktur.
const TESTIMONI = [
  { nama: "Reseller — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
  { nama: "Toko HP — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
  { nama: "Pembeli — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
];

const FAQ = [
  { q: "Apa itu deadstock? Barangnya bekas?", a: "Bukan bekas. Deadstock = stok baru & original yang tersisa dari batch lama (mis. case tipe HP generasi sebelumnya). Kondisi 100% baru, cuma dilepas harga grosir untuk kosongkan gudang." },
  { q: "Minimal order berapa untuk harga grosir?", a: `Harga grosir mulai dari ${PROMO.minOrder} pcs — boleh campur tipe/model dalam koleksi ini.` },
  { q: "Dijamin original?", a: "Ya. Kami authorized reseller Ringke, VRS, Araree, dan Supcase. Semua 100% original bergaransi." },
  { q: "Kalau stok habis, ada restock?", a: "Tidak. Namanya deadstock — jumlahnya terbatas dan tidak diproduksi lagi. Begitu habis, hilang selamanya." },
  { q: "Bisa dikirim ke seluruh Indonesia?", a: "Bisa. Dikirim via kurir pilihanmu, ongkir dihitung otomatis saat checkout." },
];

const BENEFITS = [
  { icon: BadgeCheck, title: "100% Original", desc: "Authorized reseller resmi. Bukan KW, bukan bekas." },
  { icon: TrendingUp, title: "Margin Gede", desc: "Harga grosir bikin untung besar saat dijual lagi." },
  { icon: Layers, title: "Boleh Campur Tipe", desc: `Minimal ${PROMO.minOrder} pcs, bebas mix model & warna.` },
  { icon: ShieldCheck, title: "Garansi Resmi", desc: "Tetap bergaransi walau harga grosir." },
  { icon: Truck, title: "Kirim Cepat", desc: "Proses & kirim cepat ke seluruh Indonesia." },
  { icon: PackageX, title: "Deadstock Terbatas", desc: "Stok tersisa, tidak restock. Habis ya habis." },
];

function waHref() {
  if (!PROMO.waNumber) return "/produk";
  const text = encodeURIComponent("Halo SnapFit, saya mau order grosir deadstock. Boleh minta katalog & harganya?");
  return `https://wa.me/${PROMO.waNumber}?text=${text}`;
}

export default async function GrosirLandingPage() {
  let items: ProductListItem[] = [];
  try {
    items = (await getProducts({ sort: "termurah", take: 8, skip: 0 })).items;
  } catch {
    items = [];
  }

  const orderHref = waHref();
  const orderLabel = PROMO.waNumber ? "Pesan Grosir via WhatsApp" : "Lihat Katalog Grosir";

  return (
    <div className="pb-16">
      {/* ===== Bar urgensi (sticky) ===== */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-2.5 sm:flex-row sm:px-6">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4 text-brand" />
            CUCI GUDANG DEADSTOCK · diskon s/d {PROMO.tiers[PROMO.tiers.length - 1].off}
          </p>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-background/60 sm:inline">Berakhir dalam</span>
            <CountdownTimer endsAt={PROMO.endsAt} variant="dark" />
          </div>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/30">
              <PackageX className="size-3.5" /> Deadstock · Stok Terbatas
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              Borong Case Original Harga Grosir,
              <span className="text-brand"> Untung Jual Lagi.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-background/70 text-pretty sm:text-lg">
              Case & pelindung <strong className="text-background">100% original</strong> (iPhone 11–15,
              Samsung, dll) sisa stok gudang — dilepas harga miring. Cocok reseller,
              toko HP, atau yang mau stok banyak. Sekali habis, tidak restock.
            </p>

            {/* Anchor harga */}
            <div className="mt-6 inline-flex items-baseline gap-3 rounded-xl bg-white/5 px-5 py-3">
              <span className="text-sm text-background/60">Diskon grosir hingga</span>
              <span className="text-3xl font-bold text-brand">{PROMO.discountPercent}%+</span>
            </div>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto" asChild>
                <Link href={orderHref}>
                  {PROMO.waNumber && <MessageCircle className="size-4" />}
                  {orderLabel}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="w-full border-white/20 bg-transparent text-background hover:bg-white/10 hover:text-background sm:w-auto" asChild>
                <a href="#koleksi">Lihat Koleksi</a>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-background/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand" /> Authorized Reseller</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Garansi Resmi</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-brand" /> Kirim Se-Indonesia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Statistik sosial-proof ===== */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border px-4 py-6 sm:px-6">
          {[
            { v: PROMO.stats.terjual, l: "Unit Terjual" },
            { v: PROMO.stats.reseller, l: "Reseller Aktif" },
            { v: PROMO.stats.rating, l: "Rating Pembeli" },
          ].map((s) => (
            <div key={s.l} className="px-2 text-center">
              <p className="text-2xl font-bold sm:text-3xl">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Benefit ===== */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Kenapa Borong di SnapFit?
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-border p-6">
              <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Tingkatan harga grosir ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Makin Banyak, Makin Murah
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Harga turun otomatis mengikuti jumlah order. Minimal {PROMO.minOrder} pcs (boleh campur).
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {PROMO.tiers.map((t, i) => (
              <div
                key={t.label}
                className={`relative rounded-2xl border bg-background p-6 text-center ${
                  i === PROMO.tiers.length - 1 ? "border-brand ring-1 ring-brand" : "border-border"
                }`}
              >
                {i === PROMO.tiers.length - 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-foreground">
                    Paling Hemat
                  </span>
                )}
                <p className="text-sm font-medium text-muted-foreground">{t.label}</p>
                <p className="mt-2 text-3xl font-bold text-brand">-{t.off}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t.qty}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Koleksi produk ===== */}
      <section id="koleksi" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Koleksi Deadstock</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Stok tersisa — buruan sebelum kehabisan.
          </p>
        </div>
        {items.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-muted-foreground">Koleksi sedang disiapkan.</p>
        )}
        <div className="mt-8 text-center">
          <Button size="lg" variant="outline" asChild>
            <Link href="/produk">
              Lihat Semua Produk <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ===== Testimoni ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Kata Mereka
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TESTIMONI.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border bg-background p-6">
                <div className="flex gap-0.5 text-brand">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">“{t.teks}”</p>
                <p className="mt-4 text-sm font-medium">{t.nama}</p>
                <p className="text-xs text-muted-foreground">{t.kota}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Masih Ragu? Baca Ini
        </h2>
        <div className="mt-8 divide-y divide-border border-y border-border">
          {FAQ.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
                {f.q}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="pb-4 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ===== CTA akhir ===== */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-3xl bg-foreground px-6 py-12 text-center text-background sm:px-12 sm:py-16">
          <Flame className="mx-auto size-8 text-brand" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-4xl">
            Deadstock Tidak Menunggu. Ambil Sebelum Habis.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-background/70">
            Harga grosir ini terbatas waktu & stok. Begitu berakhir, harga kembali normal.
          </p>
          <div className="mt-6 flex justify-center">
            <CountdownTimer endsAt={PROMO.endsAt} variant="dark" />
          </div>
          <div className="mt-8">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link href={orderHref}>
                {PROMO.waNumber && <MessageCircle className="size-4" />}
                {orderLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-background/50">
            Authorized reseller Ringke · VRS · Araree · Supcase — 100% original bergaransi.
          </p>
        </div>
      </section>
    </div>
  );
}
