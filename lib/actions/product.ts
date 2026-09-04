import { db } from "@/lib/db";
import { applyDiscount } from "@/lib/format";
import type { ProductQuery } from "@/lib/validations/product";

// Catatan: harga produk = harga varian termurah. Dataset dev kecil, jadi sort by harga
// & paginasi dilakukan in-memory (konsisten lintas mode). Saat skala besar, denormalisasi
// minPrice ke kolom Product agar bisa order/paginate di DB.

export type ProductListItem = {
  id: string;
  slug: string;
  name: string;
  coverImage: string;
  categoryName: string | null;
  categorySlug: string | null;
  minPrice: number;
  finalPrice: number; // setelah diskon aktif
  discountPercent: number; // 0 jika tak ada
  inStock: boolean;
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  hasMore: boolean;
};

function activeDiscountPercent(
  discounts: { percent: number; active: boolean; startAt: Date | null; endAt: Date | null }[],
): number {
  const now = Date.now();
  const percents = discounts
    .filter(
      (d) =>
        d.active &&
        (!d.startAt || d.startAt.getTime() <= now) &&
        (!d.endAt || d.endAt.getTime() >= now),
    )
    .map((d) => d.percent);
  return percents.length ? Math.max(...percents) : 0;
}

export async function getCategories() {
  return db.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export type MegaMenuCategory = {
  name: string;
  slug: string;
  products: { name: string; slug: string; coverImage: string }[];
};

/** Data untuk mega-menu header: kategori + beberapa produk tiap kategori. */
export async function getMegaMenu(): Promise<MegaMenuCategory[]> {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      slug: true,
      products: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { name: true, slug: true, coverImage: true },
      },
    },
  });
  return categories;
}

export async function getProducts(query: ProductQuery): Promise<ProductListResult> {
  const { tipe, sort, skip, take } = query;

  const products = await db.product.findMany({
    where: tipe ? { category: { slug: tipe } } : undefined,
    include: {
      category: { select: { name: true, slug: true } },
      variants: { select: { price: true, stock: true } },
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped: ProductListItem[] = products
    .filter((p) => p.variants.length > 0)
    .map((p) => {
      const minPrice = Math.min(...p.variants.map((v) => v.price));
      const percent = activeDiscountPercent(p.discounts);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        coverImage: p.coverImage,
        categoryName: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        minPrice,
        finalPrice: applyDiscount(minPrice, percent),
        discountPercent: percent,
        inStock: p.variants.some((v) => v.stock > 0),
      };
    });

  if (sort === "termurah") mapped.sort((a, b) => a.finalPrice - b.finalPrice);
  else if (sort === "termahal") mapped.sort((a, b) => b.finalPrice - a.finalPrice);
  // "terbaru" sudah terurut createdAt desc dari DB

  const total = mapped.length;
  const items = mapped.slice(skip, skip + take);
  return { items, total, hasMore: skip + take < total };
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: { price: "asc" } },
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
    },
  });
  if (!product) return null;

  const percent = activeDiscountPercent(product.discounts);
  return { ...product, discountPercent: percent };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getRelatedProducts(
  productId: string,
  categorySlug: string | null,
  take = 4,
): Promise<ProductListItem[]> {
  const { items } = await getProducts({
    tipe: categorySlug ?? undefined,
    sort: "terbaru",
    skip: 0,
    take: take + 1,
  });
  return items.filter((p) => p.id !== productId).slice(0, take);
}
