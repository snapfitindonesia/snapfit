import type { Metadata } from "next";
import logo from "@/logosnapfit.png";
import mark from "@/app/icon.png";
import { PromoPageClient } from "@/components/promo-page/PromoPageClient";
import { ProductCard } from "@/components/shop/product-card";
import { getPromoItemMeta, getPromoPageConfig, getPromoProducts } from "@/lib/promo-page/data";
import { getPromoMenu } from "@/lib/promo-page/menu";
import { PROMO_PAGE_PATH } from "@/lib/promo-page/config";
import { getHomeSections } from "@/lib/home/data";
import { blankSection, type SectionOf } from "@/lib/home/sections";

// ISR 1 jam; simpan di Admin → Halaman Buy 1 Get 1 → langsung segar (revalidateTag/Path).
// Saringan menu (?kat=…&q=…) dibaca di browser → halaman tetap statis.
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
  const [products, meta, home] = await Promise.all([
    getPromoProducts(config.products.productIds),
    getPromoItemMeta(config.products.productIds),
    getHomeSections(),
  ]);
  // Footer sama dengan halaman utama: "Langganan email" = isi bagian beranda (Admin → Konten Beranda).
  const letters = home.filter((s): s is SectionOf<"newsletter"> => s.type === "newsletter");
  const newsletter = letters.find((s) => s.active) ?? letters[0] ?? (blankSection("newsletter") as SectionOf<"newsletter">);
  // Menu hanya dari produk yang benar-benar tampil (bukan yang stok habis/diarsip).
  const shown = new Set(products.map((p) => p.id));
  const items = meta.filter((m) => shown.has(m.id));
  const menu = await getPromoMenu(config, items);
  const byId = new Map(items.map((m) => [m.id, m]));
  return (
    <PromoPageClient
      config={config}
      menu={menu}
      logoSrc={logo.src}
      markSrc={mark.src}
      homeHref={PROMO_PAGE_PATH}
      newsletter={newsletter}
      products={products.map((p, i) => ({
        id: p.id,
        slugs: byId.get(p.id)?.slugs ?? [],
        text: byId.get(p.id)?.text ?? p.name.toLowerCase(),
        card: <ProductCard product={p} priority={i < 4} />,
      }))}
    />
  );
}
