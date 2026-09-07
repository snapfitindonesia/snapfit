import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Truck,
  Flame,
  Star,
  Check,
  X,
  ChevronDown,
  ShoppingBag,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-react";
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
  shopeeUrl: "https://shopee.co.id/primaryfocuss", // toko Shopee
  countdownMinutes: 15, // durasi countdown FOMO tiap pengunjung
  priceFrom: 45000, // harga grosir mulai (anchoring)
  priceAnchor: 1249000, // harga "normal/toko" (dicoret)
  minOrder: 10, // minimal pcs paket grosir
  stats: { terjual: "500.000++", rating: "4,9+", merek: "19+" },
};

const savePercent = Math.round((1 - OFFER.priceFrom / OFFER.priceAnchor) * 100);

const BRANDS = [
  "Ringke", "Araree", "Supcase", "SnapFit", "UAG", "CaseMe", "SwitchEasy",
  "MagEasy", "ESR", "WiWU", "Spigen", "GKK", "Sulada", "Puloka",
  "Raptic X-Doria", "Caudabe", "VRS Design", "Xfitted", "Otterbox",
];

// Testimoni asli pembeli Shopee (toko primaryfocuss).
const TESTIMONI = [
  { nama: "ivan060606", variasi: "Camo Black · S25 Ultra", produk: "Ringke Case Samsung Galaxy S25 Ultra", tgl: "05 Sep 2026", teks: "Best value 👍👍, yang didapat jauh lebih banyak dibanding yang dibayar. Terima kasih, salam sehat dan sukses 🙌" },
  { nama: "n*****a", variasi: "Matte Clear", produk: "SnapFit Case Galaxy Z Flip 8 Frosted", tgl: "04 Sep 2026", teks: "Proses order cepat.. barang dikemas dengan rapi dan aman.. diterima dalam kondisi sangat baik! :)" },
  { nama: "r*****2", variasi: "Purple · Full Clear", produk: "SnapFit Lens Shield Camera Galaxy Z Flip 8", tgl: "13 Agu 2026", teks: "Sesuai dengan deskripsi. Kalau mau match dengan Flip 8 pink, pilih yang ungu muda." },
  { nama: "konicaputra", variasi: "Neon Green · 46mm", produk: "Ringke Case Apple Watch 42/46mm", tgl: "30 Jul 2026", teks: "Keren barangnya. Seller fast respon, mantap!" },
  { nama: "nzen_01", variasi: "Mallard · iPhone 16 Pro Max", produk: "UAG Case iPhone 16 Pro Max Civilian", tgl: "18 Jul 2026", teks: "Akhirnya sampe juga ni case ke tangan gw 🥰😍 seller gokil, cepet banget langsung dikirim." },
  { nama: "mnh.tessa", variasi: "Matte Clear · Vivo X300 Pro", produk: "SnapFit Case Vivo X300 Pro", tgl: "09 Jul 2026", teks: "Toko ini bagus dan amanah, saya sudah 2x belanja di sini. Thanks ya!" },
];

const REASONS = [
  { t: "100% Original, bukan KW", d: "Authorized distributor resmi. Kualitas & garansi asli, bukan tiruan pasaran." },
  { t: "Harga paling masuk akal", d: "Ambil langsung dari sumber — jadi kamu dapat harga grosir walau beli sedikit." },
  { t: "19+ merek dunia lengkap", d: "Spigen, UAG, Ringke, Supcase, ESR, Otterbox… tinggal pilih favoritmu." },
  { t: "Cocok reseller & toko", d: "Borong makin murah. Modal balik cepat, untung jalan terus." },
  { t: "Beli sesukamu", d: "Langsung di toko Shopee kami, atau chat WhatsApp — praktis." },
  { t: "Kirim cepat se-Indonesia", d: "Diproses cepat, dikirim ke seluruh Indonesia." },
];

const FAQ = [
  { q: "Kenapa model case-nya kejutan (assorted)?", a: "Supaya harganya bisa segrosir ini, model dikirim campur (bumper, clear, rugged, dll) mengikuti stok tercepat & terlaris. Merek & tipe HP tetap 100% sesuai pilihanmu — hanya modelnya yang surprise. Semua original bergaransi." },
  { q: "Dijamin original semua?", a: "Ya. Kami authorized distributor resmi 19+ merek global. Semua 100% original & bergaransi — kalau terbukti tidak asli, uang kembali." },
  { q: "Bisa beli lewat mana saja?", a: "Lewat toko Shopee kami (klik 'Beli di Shopee') atau chat WhatsApp untuk penawaran grosir. Pilih yang paling nyaman." },
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
      <a href={OFFER.shopeeUrl} target="_blank" rel="noopener noreferrer" className={cn(base, "bg-[#ee4d2d] px-8 text-base text-white")}>
        <ShoppingBag className="size-5" /> Beli di Shopee
      </a>
      <a href={waLink} target="_blank" rel="noopener noreferrer" className={cn(base, "bg-[#25d366] px-8 text-base text-white")}>
        <MessageCircle className="size-5" /> Chat WhatsApp
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
    <div className="pb-28 md:pb-16">
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
              Borong Case Original
              <br className="hidden sm:block" />
              <span className="text-brand"> Harga Grosir Distributor.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base text-background/70 text-pretty sm:text-lg">
              Case original 19+ merek dunia — Spigen, UAG, Ringke, Supcase & lainnya — dengan{" "}
              <strong className="text-background">harga grosir</strong>. 100% original dari authorized
              distributor. Beli langsung di Shopee atau chat WhatsApp. Untung besar buat reseller.
            </p>

            {/* Anchor harga */}
            <div className="mt-7 inline-flex max-w-full flex-col items-center gap-1.5 rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10 sm:px-6">
              <p className="text-xs text-background/50">
                Harga toko <span className="line-through">{formatRupiah(OFFER.priceAnchor)}</span>
              </p>
              <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1.5">
                <span className="text-sm text-background/70">Grosir mulai</span>
                <span className="text-3xl font-extrabold text-brand sm:text-4xl">
                  {formatRupiah(OFFER.priceFrom)}
                  <span className="text-base font-bold">/pcs</span>
                </span>
                <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-brand-foreground">
                  HEMAT {savePercent}%
                </span>
              </div>
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

      {/* ===== Tier harga grosir ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Makin Banyak, Makin Murah</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Harga per pcs turun otomatis mengikuti jumlah order. Minimal {OFFER.minOrder} pcs.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { qty: "10–49 pcs", label: "Grosir", off: "45%" },
              { qty: "50–99 pcs", label: "Grosir Plus", off: "50%" },
              { qty: "100+ pcs", label: "Distributor", off: "55%" },
            ].map((t, i, arr) => (
              <div key={t.label} className={`relative rounded-2xl border bg-background p-6 text-center ${i === arr.length - 1 ? "border-brand ring-1 ring-brand" : "border-border"}`}>
                {i === arr.length - 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-xs font-semibold text-brand-foreground">Paling Hemat</span>
                )}
                <p className="text-sm font-medium text-muted-foreground">{t.label}</p>
                <p className="mt-2 text-3xl font-bold text-brand">-{t.off}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t.qty}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Alasan (value) ===== */}
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          Kenapa Grosir Case di SnapFit?
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
            <Sparkles className="size-6 text-brand" /> Intip Koleksi Kami
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sebagian case original yang kami jual. Cek koleksi lengkap & harga grosir di Shopee.
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
          <a
            href={OFFER.shopeeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ee4d2d] px-8 py-4 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <ShoppingBag className="size-5" /> Lihat Semua di Shopee <ArrowRight className="size-5" />
          </a>
        </div>
      </section>

      {/* ===== Testimoni ===== */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Kata Pembeli</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Rating {OFFER.stats.rating} dari {OFFER.stats.terjual} pesanan — ulasan asli di Shopee.
          </p>
          <div className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONI.map((t, i) => (
              <div key={i} className="flex h-full flex-col rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                    {t.nama.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{t.nama}</p>
                    <div className="mt-0.5 flex gap-0.5 text-brand">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} className="size-3 fill-current" />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="mt-3 inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {t.variasi}
                </span>
                <p className="mt-3 line-clamp-4 min-h-[5rem] text-sm leading-relaxed text-muted-foreground">
                  “{t.teks}”
                </p>
                <div className="mt-auto border-t border-border pt-3">
                  <p className="line-clamp-1 text-xs font-medium">{t.produk}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t.tgl}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href={OFFER.shopeeUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-brand underline underline-offset-4 hover:opacity-80">
              Lihat semua ulasan di Shopee →
            </a>
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

      {/* ===== Sticky beli (mobile) ===== */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Flame className="size-3.5 text-brand" /> Promo berakhir dalam{" "}
          <EvergreenCountdown minutes={OFFER.countdownMinutes} variant="bar" />
        </div>
        <div className="flex gap-2">
          <a href={OFFER.shopeeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#ee4d2d] px-3 py-3 text-sm font-semibold text-white">
            <ShoppingBag className="size-4" /> Beli di Shopee
          </a>
          <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#25d366] px-3 py-3 text-sm font-semibold text-white">
            <MessageCircle className="size-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
