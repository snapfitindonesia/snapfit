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
  Boxes,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";
import { CountdownTimer } from "@/components/shop/countdown-timer";
import { GrosirConfigurator } from "@/components/shop/grosir-configurator";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Grosir Case HP — Harga Distributor 19+ Merek Original | SnapFit",
  description:
    "Grosir case HP original harga distributor: iPhone 11–15, Galaxy S20–S24, Fold/Flip 3–6, dll. Pilih merek & tipe HP, order grosir. Ringke, Spigen, UAG, ESR, Supcase & lainnya.",
};

/* ============================================================
   KONFIG PROMO/GROSIR — ganti dengan angka & tanggal ASLI-mu.
   ============================================================ */
const PROMO = {
  discountPercent: 45, // % diskon grosir (anchoring di hero)
  endsAt: "2026-09-14T23:59:59+07:00", // GANTI: tanggal & jam promo berakhir
  minOrder: 10, // minimal qty grosir
  waNumber: "", // GANTI: nomor WA tanpa "+" (mis. "628123456789"). Kosong = tombol ke katalog.
  stats: { terjual: "—", reseller: "—", rating: "—" }, // ISI ANGKA ASLI
  tiers: [
    { qty: "10–49 pcs", label: "Grosir", off: "45%" },
    { qty: "50–99 pcs", label: "Grosir Plus", off: "50%" },
    { qty: "100+ pcs", label: "Distributor", off: "55%" },
  ],
};

// Authorized distributor — 19 merek global.
const BRANDS = [
  "Ringke", "Araree", "Supcase", "SnapFit", "UAG", "CaseMe", "SwitchEasy",
  "MagEasy", "ESR", "WiWU", "Spigen", "GKK", "Sulada", "Puloka",
  "Raptic X-Doria", "Caudabe", "VRS Design", "Xfitted", "Otterbox",
];

// Tipe HP yang bisa dipilih (grosir). Tambah sesuai stok.
const SERIES = [
  "iPhone 11–15 Series",
  "iPhone 16 Series",
  "Galaxy S20–S24 Series",
  "Galaxy Z Fold 3–6",
  "Galaxy Z Flip 3–6",
  "Galaxy A Series",
  "Xiaomi / POCO",
  "Lainnya",
];

// GANTI dengan testimoni ASLI (screenshot chat/marketplace).
const TESTIMONI = [
  { nama: "Reseller — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
  { nama: "Toko HP — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
  { nama: "Online Shop — [contoh]", kota: "[kota]", teks: "[Ganti dengan testimoni pembeli aslimu di sini.]" },
];

const FAQ = [
  { q: "Kenapa model case-nya acak (assorted)?", a: "Supaya harga bisa semurah ini, model dikirim campur (bumper, clear, rugged, dll) mengikuti stok tercepat. Merek & tipe HP tetap 100% sesuai pilihanmu — yang menyesuaikan hanya model case-nya." },
  { q: "Minimal order berapa?", a: `Harga grosir mulai dari ${PROMO.minOrder} pcs — boleh campur tipe HP dalam satu order.` },
  { q: "Dijamin original semua?", a: "Ya. Kami authorized distributor resmi 19+ merek (Ringke, Spigen, UAG, Supcase, ESR, dll). Semua 100% original & bergaransi." },
  { q: "Bisa request model tertentu?", a: "Untuk order besar/khusus bisa request model — chat tim kami. Harga grosir standar memakai sistem assorted." },
  { q: "Kirim ke seluruh Indonesia?", a: "Bisa. Dikirim via kurir pilihanmu, ongkir dihitung otomatis saat checkout atau info via chat." },
];

const BENEFITS = [
  { icon: BadgeCheck, title: "100% Original", desc: "Authorized distributor resmi 19+ merek global." },
  { icon: TrendingUp, title: "Harga Distributor", desc: "Ambil dari sumber — margin jual lagi besar." },
  { icon: Boxes, title: "19+ Merek Lengkap", desc: "Ringke, Spigen, UAG, Supcase, ESR, dan banyak lagi." },
  { icon: Layers, title: "Boleh Campur", desc: `Minimal ${PROMO.minOrder} pcs, bebas mix tipe HP.` },
  { icon: ShieldCheck, title: "Garansi Resmi", desc: "Tetap bergaransi walau harga grosir." },
  { icon: Truck, title: "Kirim Cepat", desc: "Proses & kirim cepat ke seluruh Indonesia." },
];

export default async function GrosirLandingPage() {
  let items: ProductListItem[] = [];
  try {
    items = (await getProducts({ sort: "termurah", take: 8, skip: 0 })).items;
  } catch {
    items = [];
  }

  return (
    <div className="pb-16">
      {/* ===== Bar urgensi (sticky) ===== */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-foreground text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-2.5 sm:flex-row sm:px-6">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Flame className="size-4 text-brand" />
            PROMO GROSIR · diskon s/d {PROMO.tiers[PROMO.tiers.length - 1].off}
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
              <Boxes className="size-3.5" /> Authorized Distributor · 19+ Merek
            </span>
            <h1 className="mt-5 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              Grosir Case HP Original,
              <span className="text-brand"> Harga Distributor.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-background/70 text-pretty sm:text-lg">
              Pilih <strong className="text-background">merek</strong> &{" "}
              <strong className="text-background">tipe HP</strong> — order grosir case original
              (iPhone 11–15, Galaxy S20–S24, Fold/Flip 3–6, dll). Cocok reseller, toko HP & online shop.
            </p>

            <div className="mt-6 inline-flex items-baseline gap-3 rounded-xl bg-white/5 px-5 py-3">
              <span className="text-sm text-background/60">Diskon grosir hingga</span>
              <span className="text-3xl font-bold text-brand">{PROMO.discountPercent}%+</span>
            </div>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto" asChild>
                <a href="#pesan">
                  Mulai Pesan Grosir <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="w-full border-white/20 bg-transparent text-background hover:bg-white/10 hover:text-background sm:w-auto" asChild>
                <a href="#koleksi">Lihat Contoh Produk</a>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-background/60">
              <span className="inline-flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand" /> 100% Original</span>
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

      {/* ===== Konfigurator pesanan grosir ===== */}
      <section id="pesan" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Order Grosir dalam 3 Langkah</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih merek & tipe HP, tentukan jumlah — langsung kirim pesananmu.
          </p>
        </div>
        <div className="mt-8">
          <GrosirConfigurator brands={BRANDS} series={SERIES} waNumber={PROMO.waNumber} minOrder={PROMO.minOrder} />
        </div>
      </section>

      {/* ===== Brand wall ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Authorized Distributor Resmi
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Kami distributor resmi 19+ merek case & pelindung global.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BRANDS.map((b) => (
              <div
                key={b}
                className="grid place-items-center rounded-xl border border-border bg-background px-3 py-5 text-center text-sm font-bold uppercase tracking-tight text-foreground/80"
              >
                {b}
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            *Logo brand bisa ditambahkan — kirim file logonya, saya pasang.
          </p>
        </div>
      </section>

      {/* ===== Benefit ===== */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Kenapa Grosir di SnapFit?
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

      {/* ===== Contoh produk ===== */}
      <section id="koleksi" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sekilas Koleksi</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Contoh kualitas case yang kami distribusikan.
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
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Kata Mereka</h2>
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
          Pertanyaan Umum
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
            Siap Stok & Jual Lagi? Ambil Harga Grosirnya.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-background/70">
            Promo grosir terbatas waktu. Begitu berakhir, harga kembali normal.
          </p>
          <div className="mt-6 flex justify-center">
            <CountdownTimer endsAt={PROMO.endsAt} variant="dark" />
          </div>
          <div className="mt-8">
            <Button size="lg" className="w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto" asChild>
              <a href="#pesan">
                Mulai Pesan Grosir <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
          <p className="mt-4 text-xs text-background/50">
            Authorized distributor Ringke · Spigen · UAG · Supcase · ESR · & 14 merek lainnya.
          </p>
        </div>
      </section>
    </div>
  );
}
