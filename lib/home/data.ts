// Server: baca konten beranda + data dinamis tiap bagian (produk, angka ulasan, foto ulasan).
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { productPath } from "@/lib/product-url";
import { getProducts, getFeaturedProducts, type ProductListItem } from "@/lib/actions/product";
import { DEFAULT_SECTIONS, sectionsSchema, type HomeSection } from "@/lib/home/sections";
import { getPublishedArticles, type ArticleCardData } from "@/lib/articles";
import { buildFallback } from "@/lib/build-fallback";

export const HOME_KEY = "home.sections";
export const HOME_TAG = "home-sections";

/**
 * Konten tersimpan dari admin (cache bertag; saveHomeSections membersihkannya). null = belum pernah
 * disimpan. Isi bawaan SENGAJA tak ikut di-cache — agar perubahan DEFAULT_SECTIONS di kode langsung
 * berlaku setelah deploy (Data Cache Vercel bisa bertahan lintas deploy).
 */
const getSavedSections = unstable_cache(
  async (): Promise<unknown> => (await db.siteSetting.findUnique({ where: { key: HOME_KEY } }))?.value ?? null,
  ["home-sections-saved"],
  { revalidate: 3600, tags: [HOME_TAG] },
);

/** Bagian beranda: tersimpan (valid) atau isi bawaan. */
export async function getHomeSections(): Promise<HomeSection[]> {
  const saved = await getSavedSections();
  if (saved == null) return DEFAULT_SECTIONS;
  const parsed = sectionsSchema.safeParse(saved);
  return parsed.success ? parsed.data : DEFAULT_SECTIONS;
}

/** Untuk editor admin: langsung dari DB (tanpa cache) — agar admin selalu mengedit versi terbaru. */
export async function getHomeSectionsFresh(): Promise<HomeSection[]> {
  const saved = (await db.siteSetting.findUnique({ where: { key: HOME_KEY } }))?.value ?? null;
  if (saved == null) return DEFAULT_SECTIONS;
  const parsed = sectionsSchema.safeParse(saved);
  return parsed.success ? parsed.data : DEFAULT_SECTIONS;
}

export type ReviewStats = { total: number; fiveStar: number; avg: number };
export type ReviewShot = { image: string; caption: string; href: string };

/** Data dinamis yang dibutuhkan bagian aktif (hanya yang diperlukan yang di-query). */
export type HomeData = {
  products: Record<string, ProductListItem[]>; // per id bagian "products"
  reviews: ReviewStats | null;
  shots: ReviewShot[];
  articles: ArticleCardData[];
};

async function productsFor(s: Extract<HomeSection, { type: "products" }>): Promise<ProductListItem[]> {
  if (s.source === "unggulan") return getFeaturedProducts(s.limit);
  const q = s.source === "cari" && s.query.trim() ? s.query.trim() : undefined;
  const { items } = await getProducts({ q, sort: "terbaru", skip: 0, take: s.limit });
  return items;
}

export async function loadHomeData(sections: HomeSection[]): Promise<HomeData> {
  const active = sections.filter((s) => s.active);
  const needReviews = active.some((s) => s.type === "reviews");
  const needShots = active.some((s) => s.type === "community" && s.source === "ulasan");
  const articleLimit = Math.max(0, ...active.map((s) => (s.type === "articles" ? s.limit : 0)));

  const [productEntries, reviews, shots, articles] = await Promise.all([
    Promise.all(
      active
        .filter((s): s is Extract<HomeSection, { type: "products" }> => s.type === "products")
        .map(async (s) => [s.id, await productsFor(s).catch((e) => buildFallback(e, []))] as const),
    ),
    needReviews ? reviewStats().catch((e) => buildFallback(e, null)) : null,
    needShots ? reviewShots().catch((e) => buildFallback(e, [])) : [],
    articleLimit ? getPublishedArticles(articleLimit).catch((e) => buildFallback(e, [])) : [],
  ]);
  return { products: Object.fromEntries(productEntries), reviews, shots, articles };
}

async function reviewStats(): Promise<ReviewStats> {
  const where = { approved: true };
  const [agg, fiveStar] = await Promise.all([
    db.review.aggregate({ where, _count: true, _avg: { rating: true } }),
    db.review.count({ where: { ...where, rating: 5 } }),
  ]);
  return { total: agg._count, fiveStar, avg: agg._avg.rating ?? 0 };
}

/** Foto dari ulasan pembeli yang disetujui (terbaru), untuk bagian Komunitas. */
async function reviewShots(): Promise<ReviewShot[]> {
  const rows = await db.review.findMany({
    where: { approved: true, OR: [{ photo: { not: null } }, { image: { not: null } }], product: { archived: false } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { photo: true, image: true, author: true, product: { select: { slug: true, shortId: true } } },
  });
  return rows
    .map((r) => ({ image: (r.photo || r.image) ?? "", caption: r.author, href: productPath(r.product) }))
    .filter((r) => r.image);
}
