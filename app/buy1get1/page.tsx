import type { Metadata } from "next";
import logo from "@/logosnapfit.png";
import mark from "@/app/icon.png";
import { PromoPageClient } from "@/components/promo-page/PromoPageClient";
import { ProductCard } from "@/components/shop/product-card";
import { getPromoPageConfig, getPromoProducts } from "@/lib/promo-page/data";
import { getPromoMenu } from "@/lib/promo-page/menu";
import { PROMO_PAGE_PATH } from "@/lib/promo-page/config";

// ISR 1 jam; simpan di Admin → Halaman Buy 1 Get 1 → langsung segar (revalidateTag/Path).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const c = await getPromoPageConfig();
  return {
    title: { absolute: c.title || "Buy 1 Get 1 — SNAPFIT" },
    description: c.description,
    alternates: { canonical: PROMO_PAGE_PATH },
    openGraph: { title: c.title, description: c.description, url: PROMO_PAGE_PATH, ...(c.hero.image ? { images: [c.hero.image] } : {}) },
  };
}

export default async function BuyOneGetOnePage() {
  const config = await getPromoPageConfig();
  const showProducts = config.sections.some((s) => s.key === "products" && s.active);
  const [menu, products] = await Promise.all([
    getPromoMenu(config),
    showProducts ? getPromoProducts(config.products.productIds) : Promise.resolve([]),
  ]);
  return (
    <PromoPageClient
      config={config}
      menu={menu}
      logoSrc={logo.src}
      markSrc={mark.src}
      homeHref={PROMO_PAGE_PATH}
      products={
        products.length ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        ) : undefined
      }
    />
  );
}
