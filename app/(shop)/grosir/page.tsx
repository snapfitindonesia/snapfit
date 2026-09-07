import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Truck,
  Flame,
  Star,
  Boxes,
  Check,
  X,
  ChevronDown,
  ShoppingBag,
  MessageCircle,
  Store,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";
import { EvergreenCountdown } from "@/components/shop/evergreen-countdown";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Case Original Harga Grosir — Spigen, UAG, Ringke & 16+ Merek | SnapFit",
  description:
    "Case HP original harga grosir dari authorized distributor 19+ merek dunia. Beli satuan atau borong. Bisa via Shopee, WhatsApp, atau website. Garansi 100% original.",
};

/* ============================================================
   KONFIG — ganti dengan data ASLI-mu.
   ============================================================ */
const OFFER = {
  waNumber: "6285179779770",
  shopeeUrl: "https://shopee.co.id/snapfit.id", // GANTI: link toko Shopee-mu
  countdownMinutes: 15, // durasi countdown FOMO tiap pengunjung
  priceFrom: 29000, // harga termurah (anchoring)
  priceAnchor: 99000, // harga "normal/toko lain" (dicoret)
  stats: { terjual: "—", rating: "—", merek: "19+" }, // ISI ANGKA ASLI (terjual, rating)
};

const savePercent = Math.round((1 - OFFER.priceFrom / OFFER.priceAnchor) * 100);

const BRANDS = [
  "Ringke", "Araree", "Supcase", "SnapFit", "UAG", "CaseMe", "SwitchEasy",
  "MagEasy", "ESR", "WiWU", "Spigen", "GKK", "Sulada", "Puloka",
  "Raptic X-Doria", "Caudabe", "VRS Design", "Xfitted", "Otterbox",
];

// GANTI dengan testimoni ASLI (screenshot chat/marketplace).
const TESTIMONI = [
  { nama: "[contoh]", info: "Reseller · [kota]", teks: "[Ganti dengan testimoni pembeli aslimu.]" },
  { nama: "[contoh]", info: "Toko HP · [kota]", teks: "[Ganti dengan testimoni pembeli aslimu.]" },
  { nama: "[contoh]", info: "Pembeli · [kota]", teks: "[Ganti dengan testimoni pembeli aslimu.]" },
];

const REASONS = [
  { t: "100% Original, bukan KW", d: "Authorized distributor resmi. Kualitas & garansi asli, bukan tiruan pasaran." },
  { t: "Harga paling masuk akal", d: "Ambil langsung dari sumber — jadi kamu dapat harga grosir walau beli sedikit." },
  { t: "19+ merek dunia lengkap", d: "Spigen, UAG, Ringke, Supcase, ESR, Otterbox… tinggal pilih favoritmu." },
  { t: "Cocok reseller & toko", d: "Borong makin murah. Modal balik cepat, untung jalan terus." },
  { t: "Beli sesukamu", d: "Checkout di web, chat WhatsApp, atau ambil di Shopee — semua bisa." },
  { t: "Kirim cepat se-Indonesia", d: "Diproses cepat, dikirim ke seluruh Indonesia." },
];

const FAQ = [
  { q: "Dijamin original semua?", a: "Ya. Kami authorized distributor resmi 19+ merek global. Semua 100% original & bergaransi — kalau terbukti tidak asli, uang kembali." },
  { q: "Bisa beli lewat mana saja?", a: "Bebas: checkout langsung di website ini, chat WhatsApp, atau beli di toko Shopee kami. Pilih yang paling nyaman buatmu." },
  { q: "Ada harga grosir untuk reseller?", a: "Ada. Makin banyak makin murah. Chat WhatsApp kami untuk penawaran grosir & jadi reseller." },
  { q: "Kirim ke seluruh Indonesia?", a: "Bisa. Ongkir dihitung otomatis saat checkout, atau tanya via chat." },
];

const waLink = `https://wa.me/${OFFER.waNumber}?text=${encodeURIComponent(
  "Halo SnapFit, saya mau tanya/pesan case original. Boleh info stok & harganya? 🙏",
)}`;

function BuyButtons({ className }: { className?: string }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0";
  return (
    <div className={cn("flex w-full flex-col gap-3 sm:w-auto sm:flex-row", className)}>
      <Link href="/produk" className={cn(base, "bg-brand text-brand-foreground")}>
        <Store className="size-4" /> Belanja di Web
      </Link>
      <a href={OFFER.shopeeUrl} target="_blank" rel="noopener noreferrer" className={cn(base, "bg-[#ee4d2d] text-white")}>
        <ShoppingBag className="size-4" /> Beli di Shopee
      </a>
      <a href={waLink} target="_blank" rel="noopener noreferrer" className={cn(base, "bg-[#25d366] text-white")}>
        <MessageCircle className="size-4" /> Chat WhatsApp
      </a>
    </div>
  );
}

export default async function GrosirLandingPage() {
  let items: ProductListItem[] = [];
  try {
    items = (await getProducts({ sort: "termurah", take: 8, skip: 0 })).items;
  } catch {
    items = [];
  }

  return (
    <div className="pb-44 md:pb-16">
      {/* ===== Bar urgensi (sticky) ===== */}
      <div className="sticky top-0 z-30 bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-semibold sm:px-6">
          <Flame className="size-4 shrink-0" />
          <span>Harga promo naik lagi dalam</span>
          <EvergreenCountdown minutes={OFFER.countdownMinutes} variant="bar" />
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-brand/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/30">
              <BadgeCheck className="size-3.5" /> Authorized Distributor · 19+ Merek Dunia
            </span>

            <h1 className="mt-5 text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">
              Case Original Premium,
              <br className="hidden sm:block" />
              <span className="text-brand"> Harga Bikin Nagih.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base text-background/70 text-pretty sm:text-lg">
              Lindungi HP mahalmu dengan case <strong className="text-background">100% original</strong> —
              Spigen, UAG, Ringke, Supcase & 15 merek lain. Bukan KW pasaran. Beli satuan atau borong grosir.
            </p>

            {/* Anchor harga */}
            <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white/5 px-6 py-4 ring-1 ring-white/10">
              <div className="text-left">
                <p className="text-xs text-background/50">Harga normal <span className="line-through">{formatRupiah(OFFER.priceAnchor)}</span></p>
                <p className="text-sm text-background/70">Mulai dari</p>
              </div>
              <p className="text-4xl font-extrabold text-brand sm:text-5xl">{formatRupiah(OFFER.priceFrom)}</p>
              <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground">HEMAT {savePercent}%</span>
            </div>

            {/* Countdown FOMO */}
            <div className="mt-7 flex flex-col items-center gap-2">
              <p className="flex items-center gap-1.5 text-sm font-medium text-background/80">
                <Zap className="size-4 text-brand" /> Buruan, harga promo ini hangus dalam:
              </p>
              <EvergreenCountdown minutes={OFFER.countdownMinutes} variant="dark" />
            </div>

            <div className="mt-8 flex justify-center">
              <BuyButtons />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-background/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-brand" /> Garansi Original / Uang Kembali</span>
              <span className="inline-flex items-center gap-1.5"><Truck className="size-4 text-brand" /> Kirim Se-Indonesia</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Statistik ===== */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border px-4 py-6 sm:px-6">
          {[
            { v: OFFER.stats.terjual, l: "Unit Terjual" },
            { v: OFFER.stats.rating, l: "Rating Pembeli" },
            { v: OFFER.stats.merek, l: "Merek Original" },
          ].map((s) => (
            <div key={s.l} className="px-2 text-center">
              <p className="text-2xl font-bold sm:text-3xl">{s.v}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Alasan (value) ===== */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Kenapa Beli Case di SnapFit?
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          {REASONS.map((r) => (
            <div key={r.t} className="flex gap-3">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                <Check className="size-4" />
              </span>
              <div>
                <p className="font-semibold">{r.t}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{r.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Perbandingan (anchoring) ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Jangan Beli Case Abal-abal Lagi
          </h2>
          <div className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
            <div className="bg-background p-5 sm:p-6">
              <p className="text-sm font-semibold text-muted-foreground">Case Murahan Sebelah</p>
              <ul className="mt-4 space-y-3 text-sm">
                {["KW / tiruan", "Gampang kuning & getas", "Tanpa garansi", "Proteksi seadanya"].map((x) => (
                  <li key={x} className="flex items-start gap-2 text-muted-foreground">
                    <X className="mt-0.5 size-4 shrink-0 text-destructive" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-foreground p-5 text-background sm:p-6">
              <p className="text-sm font-semibold text-brand">Case Original SnapFit</p>
              <ul className="mt-4 space-y-3 text-sm">
                {["100% original bergaransi", "Material premium tahan lama", "Garansi / uang kembali", "Proteksi teruji anti-jatuh"].map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Garansi (risk reversal) ===== */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-brand/40 p-8 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-brand">
            <ShieldCheck className="size-7" />
          </span>
          <h2 className="text-xl font-bold sm:text-2xl">Garansi 100% Original — atau Uang Kembali</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Kami authorized distributor resmi. Kalau kamu terima produk yang terbukti tidak original,
            kami kembalikan uangmu. Sesederhana itu — belanja tanpa was-was.
          </p>
        </div>
      </section>

      {/* ===== Brand wall ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            Authorized Distributor Resmi
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">19+ merek case & pelindung global.</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {BRANDS.map((b) => (
              <div key={b} className="grid place-items-center rounded-xl border border-border bg-background px-3 py-5 text-center text-sm font-bold uppercase tracking-tight text-foreground/80">
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Best seller ===== */}
      <section id="koleksi" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6">
        <div className="text-center">
          <h2 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <Sparkles className="size-6 text-brand" /> Paling Diburu
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Case original favorit — stok gerak cepat.</p>
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
                <p className="text-xs text-muted-foreground">{t.info}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Pertanyaan Umum</h2>
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
        <div className="relative overflow-hidden rounded-3xl bg-foreground px-6 py-12 text-center text-background sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              Case Idaman Nunggu Kamu. Ambil Sebelum Harganya Naik.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-background/70">
              Harga promo ini cuma berlaku selama hitungan mundur di bawah masih jalan.
            </p>
            <div className="mt-6 flex justify-center">
              <EvergreenCountdown minutes={OFFER.countdownMinutes} variant="dark" />
            </div>
            <div className="mt-8 flex justify-center">
              <BuyButtons />
            </div>
            <p className="mt-5 text-xs text-background/50">
              Authorized distributor Ringke · Spigen · UAG · Supcase · ESR · & 14 merek lainnya.
            </p>
          </div>
        </div>
      </section>

      {/* ===== Sticky beli (mobile) — di atas bottom nav global ===== */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-y border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Flame className="size-3.5 text-brand" /> Promo berakhir dalam{" "}
          <EvergreenCountdown minutes={OFFER.countdownMinutes} variant="bar" />
        </div>
        <div className="flex gap-2">
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-2.5 text-sm font-semibold text-white">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <a href={OFFER.shopeeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#ee4d2d] px-3 py-2.5 text-sm font-semibold text-white">
            <ShoppingBag className="size-4" /> Shopee
          </a>
          <Link href="/produk" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-brand-foreground">
            <Store className="size-4" /> Web
          </Link>
        </div>
      </div>
    </div>
  );
}
