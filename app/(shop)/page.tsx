import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getProducts,
  getDeviceTree,
  type ProductListItem,
  type DeviceBrand,
} from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";
import { DevicePicker } from "@/components/shop/device-picker";

// ISR: homepage di-cache (cepat), regenerasi tiap 5 menit.
export const revalidate = 300;

export default async function HomePage() {
  // Tahan-banting: kalau DB ngadat saat build, jangan gagalkan deploy —
  // ISR akan mengisi produk unggulan saat request pertama.
  let featured: ProductListItem[] = [];
  try {
    featured = (await getProducts({ sort: "terbaru", take: 4, skip: 0 })).items;
  } catch {
    featured = [];
  }

  let deviceTree: DeviceBrand[] = [];
  try {
    deviceTree = await getDeviceTree();
  } catch {
    deviceTree = [];
  }

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

      {/* Pilih tipe HP kamu — drill-down brand → line → model (lihat 02-design-system.md) */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <DevicePicker tree={deviceTree} />
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

    </>
  );
}
