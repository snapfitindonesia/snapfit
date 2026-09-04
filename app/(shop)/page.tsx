import Link from "next/link";
import { ArrowRight, ShieldCheck, BadgeCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";

// ISR: homepage di-cache (cepat), regenerasi tiap 5 menit.
export const revalidate = 300;

const DEVICE_TYPES = [
  { label: "iPhone", href: "/produk?tipe=iphone" },
  { label: "Samsung", href: "/produk?tipe=samsung" },
  { label: "iPad & Tablet", href: "/produk?tipe=tablet" },
  { label: "Lainnya", href: "/produk" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Garansi Resmi" },
  { icon: BadgeCheck, label: "100% Original" },
  { icon: RotateCcw, label: "7 Hari Pengembalian" },
];

export default async function HomePage() {
  const { items: featured } = await getProducts({
    sort: "terbaru",
    take: 4,
    skip: 0,
  });

  return (
    <>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-8 py-12 sm:py-16 md:grid-cols-2 md:gap-12 md:py-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="text-sm font-medium text-muted-foreground">
              Aksesori HP & tablet
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Yang benar-benar pas.
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted-foreground text-pretty">
              Pilih tipe HP-mu, temukan case & pelindung yang cocok — tanpa
              tebak-tebakan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/produk">
                  Belanja sekarang
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href="/produk">Lihat semua produk</Link>
              </Button>
            </div>
          </div>

          {/* Placeholder foto hero — foto produk jadi bintang (belum ada data) */}
          <div className="aspect-[4/3] w-full animate-in fade-in zoom-in-95 rounded-xl border border-border bg-muted delay-150 duration-700 fill-mode-both" />
        </div>
      </section>

      {/* Pilih tipe HP kamu — UX paling kritis (lihat 02-design-system.md) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="rounded-2xl border border-border p-6 sm:p-8">
          <h2 className="text-lg font-medium">Pilih tipe HP kamu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kami tampilkan yang pas untuk perangkatmu.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEVICE_TYPES.map((t) => (
              <Link
                key={t.label}
                href={t.href}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                {t.label}
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Produk unggulan — grid placeholder (belum ada data) */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            Produk unggulan
          </h2>
          <Link
            href="/produk"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Lihat semua
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* Brand story strip — keunggulan single-brand */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-12 sm:grid-cols-3 sm:px-6">
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-5" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Setiap produk dikurasi langsung oleh SnapFit.
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
