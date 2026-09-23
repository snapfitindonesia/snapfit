import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getProducts,
  getDeviceTree,
  getMainBanners,
  type ProductListItem,
  type DeviceBrand,
  type MainBanner,
} from "@/lib/actions/product";
import { ProductCard } from "@/components/shop/product-card";
import { DevicePicker } from "@/components/shop/device-picker";
import { HeroCarousel, type HeroSlide } from "@/components/shop/hero-carousel";
import { BannerCarousel } from "@/components/shop/banner-carousel";

// ISR: homepage di-cache (cepat), regenerasi tiap 5 menit.
export const revalidate = 300;

// Hero banner: produk device terbaru dari brand mitra (authorized reseller).
const HERO_SLIDES: HeroSlide[] = [
  {
    image:
      "https://cdn.shopify.com/s/files/1/1270/3733/files/1c577dc6092d75c0e453206fe7bae282_1dbf26b5-e4b3-4e32-9298-c1bbc2f38db3.jpg?v=1784240712",
    brand: "VRS Design",
    caption: "Galaxy Z Fold 8 · Case Rugged Premium",
    href: "/produk/vrs-active-z-fold-8-ultra",
  },
  {
    image:
      "https://cdn.shopify.com/s/files/1/1696/1045/files/SUPCASE_iPhone_16_Pro_Max_Unicorn_Beetle_XT_MagSafe_phone_case_Ruddy_1x1_2c1bd284-d24a-4dff-a6ab-f918e0b46c95.png?v=1724767101",
    brand: "Supcase",
    caption: "iPhone 16 Pro Max · Unicorn Beetle MagSafe",
    href: "/produk?tipe=apple",
  },
  {
    image:
      "https://cdn.shopify.com/s/files/1/1352/5175/files/XM17U_FUSX_MGNT_Main.jpg?v=1777668398",
    brand: "Ringke",
    caption: "Xiaomi 17 Ultra · Fusion-X Magnetic",
    href: "/produk/ringke-xiaomi-17-ultra-case-fusion-x",
  },
];

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

  let banners: MainBanner[] = [];
  try {
    banners = await getMainBanners();
  } catch {
    banners = [];
  }

  return (
    <>
      {/* Hero banner besar (1200×600) — dikelola di Admin → Banner (type MAIN) */}
      {banners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <BannerCarousel banners={banners} />
        </section>
      )}

      {/* Hero teks — fallback bila belum ada banner */}
      {banners.length === 0 && (
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

          {/* Hero banner: carousel produk device terbaru */}
          <div className="animate-in fade-in zoom-in-95 delay-150 duration-700 fill-mode-both">
            <HeroCarousel slides={HERO_SLIDES} />
          </div>
        </div>
      </section>
      )}

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
