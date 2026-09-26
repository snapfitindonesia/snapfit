import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { listLandingPages } from "@/lib/seo-pages";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id").replace(/\/$/, "");

// Regenerasi tiap jam (produk baru masuk sitemap tanpa rebuild).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/produk`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/grosir`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/bantuan`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE}/links`, lastModified: now, changeFrequency: "weekly", priority: 0.4 },
  ];

  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await db.product.findMany({
      where: { archived: false },
      select: { slug: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    productPages = products.map((p) => ({
      url: `${SITE}/produk/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // DB tak terjangkau saat build → sitemap tetap terbit dgn halaman statis.
  }

  // Halaman landing SEO kategori & merek (hanya yang punya produk tersedia).
  let landingPages: MetadataRoute.Sitemap = [];
  try {
    const { categories, mereks } = await listLandingPages();
    landingPages = [
      ...categories.map((slug) => ({ url: `${SITE}/kategori/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.85 })),
      ...mereks.map((slug) => ({ url: `${SITE}/merek/${slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.85 })),
    ];
  } catch {
    // abaikan — sitemap tetap terbit
  }

  return [...staticPages, ...landingPages, ...productPages];
}
