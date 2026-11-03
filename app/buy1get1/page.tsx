import { cache } from "react";
import type { Metadata } from "next";
import logo from "@/logosnapfit.png";
import mark from "@/app/icon.png";
import { PromoPageClient } from "@/components/promo-page/PromoPageClient";
import { getPromoItemMeta, getPromoPageConfig, getPromoProducts } from "@/lib/promo-page/data";
import { getPromoMenu } from "@/lib/promo-page/menu";
import { deviceSlugs } from "@/lib/promo-page/devices";
import { PROMO_PAGE_PATH } from "@/lib/promo-page/config";
import { getHomeSections } from "@/lib/home/data";
import { blankSection, type SectionOf } from "@/lib/home/sections";
import { jsonLdHtml } from "@/lib/json-ld";
import { BRAND_NAME, ORG_ID, SITE } from "@/lib/brand";
import { productPath } from "@/lib/product-url";

// ISR 1 jam; simpan di Admin → Halaman Buy 1 Get 1 → langsung segar (revalidateTag/Path).
// Saringan menu (?kat=…&q=…) dibaca di browser → halaman tetap statis.
export const revalidate = 3600;

// Kosong / bawaan lama (sebelum SEO Nov 2026) → judul & deskripsi otomatis berkata kunci.
const OLD_TITLES = new Set(["", "Buy 1 Get 1 — SNAPFIT"]);
const SEO_TITLE = "Promo Buy 1 Get 1 Case HP & Aksesori";
const seoDescription = (count: number, brands: string[]) =>
  `Promo Buy 1 Get 1 SNAPFIT: beli 1 case HP, gratis 1 case/aksesori. ${count ? `${count} produk ` : ""}untuk ${
    brands.slice(0, 4).join(", ") || "iPhone, Samsung Galaxy & iPad"
  }. Original, kirim setiap hari.`;

// Dipakai generateMetadata & halaman → satu kali muat per render (React cache).
const load = cache(async () => {
  const config = await getPromoPageConfig();
  const ids = config.products.productIds;
  const [products, meta] = await Promise.all([getPromoProducts(ids), getPromoItemMeta(ids)]);
  const byId = new Map(meta.map((m) => [m.id, m]));
  // Saringan = kategori (bila ada) + perangkat dari judul (produk impor Shopee umumnya tanpa kategori).
  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.coverImage,
    slugs: [...new Set([...(byId.get(p.id)?.slugs ?? []), ...deviceSlugs(p.name)])],
    text: byId.get(p.id)?.text ?? [p.name, p.brand ?? ""].join("\u0000").toLowerCase(),
  }));
  const menu = getPromoMenu(config, items);
  return { config, products, items, menu };
});

export async function generateMetadata(): Promise<Metadata> {
  const { config: c, products, menu } = await load();
  const title = OLD_TITLES.has(c.title.trim()) ? SEO_TITLE : c.title;
  const description =
    !c.description.trim() || c.description.startsWith("Promo Buy 1 Get 1 SNAPFIT: beli 1 aksesori") // bawaan lama
      ? seoDescription(products.length, menu.segments.map((s) => s.label))
      : c.description;
  const image = c.hero.image || products[0]?.coverImage;
  return {
    title, // + template "| SNAPFIT Indonesia" dari layout
    description,
    keywords: ["promo buy 1 get 1", "beli 1 gratis 1", "case hp", ...menu.segments.map((s) => `case ${s.label.toLowerCase()} buy 1 get 1`)],
    alternates: { canonical: PROMO_PAGE_PATH },
    openGraph: { type: "website", title, description, url: PROMO_PAGE_PATH, ...(image ? { images: [{ url: image, alt: title }] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function BuyOneGetOnePage() {
  const { config, products, items, menu } = await load();
  const home = await getHomeSections();
  // Footer sama dengan halaman utama: "Langganan email" = isi bagian beranda (Admin → Konten Beranda).
  const letters = home.filter((s): s is SectionOf<"newsletter"> => s.type === "newsletter");
  const newsletter = letters.find((s) => s.active) ?? letters[0] ?? (blankSection("newsletter") as SectionOf<"newsletter">);
  const byId = new Map(items.map((m) => [m.id, m]));

  // Data terstruktur: halaman koleksi + daftar produk + breadcrumb.
  const url = `${SITE}${PROMO_PAGE_PATH}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: `Promo Buy 1 Get 1 — ${BRAND_NAME}`,
        description: seoDescription(products.length, menu.segments.map((s) => s.label)),
        inLanguage: "id-ID",
        isPartOf: { "@id": `${SITE}/#website` },
        publisher: { "@id": ORG_ID },
        breadcrumb: { "@id": `${url}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement: products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${productPath(p)}`, name: p.name })),
        },
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "Promo Buy 1 Get 1", item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />
      <PromoPageClient
        config={config}
        menu={menu}
        logoSrc={logo.src}
        markSrc={mark.src}
        homeHref={PROMO_PAGE_PATH}
        newsletter={newsletter}
        products={products.map((p) => ({ id: p.id, slugs: byId.get(p.id)!.slugs, text: byId.get(p.id)!.text, product: p }))}
      />
    </>
  );
}
