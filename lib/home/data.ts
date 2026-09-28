// Server: baca konten beranda + data dinamis tiap bagian (produk, angka ulasan, foto ulasan).
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getProducts, getFeaturedProducts, type ProductListItem } from "@/lib/actions/product";
import { DEFAULT_SECTIONS, sectionsSchema, type HomeSection } from "@/lib/home/sections";

export const HOME_KEY = "home.sections";
export const HOME_TAG = "home-sections";

/** Konten beranda tersimpan (cache bertag; saveHomeSections membersihkannya). Rusak/kosong → bawaan. */
export const getHomeSections = unstable_cache(
  async (): Promise<HomeSection[]> => {
    const row = await db.siteSetting.findUnique({ where: { key: HOME_KEY } });
    if (!row) return DEFAULT_SECTIONS;
    const parsed = sectionsSchema.safeParse(row.value);
    return parsed.success ? parsed.data : DEFAULT_SECTIONS;
  },
  ["home-sections"],
  { revalidate: 3600, tags: [HOME_TAG] },
);

export type ReviewStats = { total: number; fiveStar: number; avg: number };
export type ReviewShot = { image: string; caption: string; href: string };

/** Data dinamis yang dibutuhkan bagian aktif (hanya yang diperlukan yang di-query). */
export type HomeData = {
  products: Record<string, ProductListItem[]>; // per id bagian "products"
  reviews: ReviewStats | null;
  shots: ReviewShot[];
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

  const [productEntries, reviews, shots] = await Promise.all([
    Promise.all(
      active
        .filter((s): s is Extract<HomeSection, { type: "products" }> => s.type === "products")
        .map(async (s) => [s.id, await productsFor(s).catch(() => [])] as const),
    ),
    needReviews ? reviewStats().catch(() => null) : null,
    needShots ? reviewShots().catch(() => []) : [],
  ]);
  return { products: Object.fromEntries(productEntries), reviews, shots };
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
    select: { photo: true, image: true, author: true, product: { select: { slug: true } } },
  });
  return rows
    .map((r) => ({ image: (r.photo || r.image) ?? "", caption: r.author, href: `/produk/${r.product.slug}` }))
    .filter((r) => r.image);
}
