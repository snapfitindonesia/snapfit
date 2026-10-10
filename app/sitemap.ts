import type { MetadataRoute } from "next";
import { CAMPAIGN_SLUGS } from "@/lib/campaigns";
import { db } from "@/lib/db";
import { productPath } from "@/lib/product-url";
import { listLandingPages } from "@/lib/seo-pages";
import { buildFallback } from "@/lib/build-fallback";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id").replace(/\/$/, "");

// Regenerasi tiap jam (produk baru masuk sitemap tanpa rebuild).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/produk`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/grosir`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...CAMPAIGN_SLUGS.map((slug) => ({ url: `${SITE}/promo/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
    { url: `${SITE}/bantuan`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/links`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
    { url: `${SITE}/lacak`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await db.product.findMany({
      where: { archived: false },
      select: { slug: true, shortId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    productPages = products.map((p) => ({
      url: `${SITE}${productPath(p)}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch (e) {
    // Saat build (DB tak terjangkau) → terbit dgn halaman statis. Saat regenerasi: LEMPAR agar Google tetap
    // menerima sitemap terakhir yang lengkap (bukan versi tanpa produk yang ter-cache 1 jam).
    productPages = buildFallback(e, []);
  }

  // Halaman landing SEO kategori & merek (hanya yang punya produk tersedia).
  let landingPages: MetadataRoute.Sitemap = [];
  try {
    const { categories, mereks } = await listLandingPages();
    landingPages = [
      ...categories.map((slug) => ({ url: `${SITE}/kategori/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.85 })),
      ...mereks.map((slug) => ({ url: `${SITE}/merek/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.85 })),
    ];
  } catch (e) {
    landingPages = buildFallback(e, []);
  }

  // Artikel terbit.
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const rows = await db.article.findMany({ where: { published: true, publishedAt: { lte: now } }, select: { slug: true, updatedAt: true } });
    articlePages = rows.map((a) => ({ url: `${SITE}/artikel/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 }));
    if (rows.length) articlePages.unshift({ url: `${SITE}/artikel`, lastModified: now, changeFrequency: "weekly", priority: 0.6 });
  } catch (e) {
    articlePages = buildFallback(e, []);
  }

  return [...staticPages, ...landingPages, ...articlePages, ...productPages];
}
