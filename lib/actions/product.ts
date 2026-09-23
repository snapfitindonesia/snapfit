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

/** Kategori "line" (tingkat 2) — dipakai chip filter di halaman /produk. */
export async function getCategories() {
  return db.category.findMany({
    where: { parentId: { not: null } },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    select: { id: true, name: true, slug: true },
  });
}

export type DeviceModel = { label: string; count: number };
export type DeviceLine = { name: string; slug: string; productCount: number; models: DeviceModel[] };
export type DeviceBrand = { name: string; slug: string; lines: DeviceLine[] };

/**
 * Pohon pemilih perangkat untuk homepage (drill-down 3 tingkat):
 * Brand → Line → Model. Model diturunkan dari variant.type (selalu sinkron).
 * Hanya brand/line yang punya produk yang ditampilkan.
 */
export async function getDeviceTree(): Promise<DeviceBrand[]> {
  try {
    const brands = await db.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        children: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: {
            name: true,
            slug: true,
            products: { select: { variants: { select: { type: true } } } },
          },
        },
      },
    });

    return brands
      .map((b) => ({
        name: b.name,
        slug: b.slug,
        lines: b.children
          .map((l) => {
            const counts = new Map<string, number>();
            for (const p of l.products) {
              const types = new Set(
                p.variants.map((v) => v.type.trim()).filter(Boolean),
              );
              for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
            }
            return {
              name: l.name,
              slug: l.slug,
              productCount: l.products.length,
              models: Array.from(counts.entries())
                .map(([label, count]) => ({ label, count }))
                .sort((a, b) => a.label.localeCompare(b.label)),
            };
          })
          .filter((l) => l.productCount > 0),
      }))
      .filter((b) => b.lines.length > 0);
  } catch {
    return [];
  }
}

export type MainBanner = { id: string; image: string; href: string };

/** Banner utama (hero) — type MAIN & aktif, terurut. Ukuran ideal 1200×600. */
export async function getMainBanners(): Promise<MainBanner[]> {
  try {
    const banners = await db.banner.findMany({
      where: { type: "MAIN", active: true },
      orderBy: [{ order: "asc" }],
      select: { id: true, image: true, targetUrl: true },
    });
    return banners.map((b) => ({ id: b.id, image: b.image, href: b.targetUrl || "/produk" }));
  } catch {
    return [];
  }
}

export type MegaMenuLine = { name: string; slug: string; cover: string | null; models: string[] };
export type MegaMenuBrand = { name: string; slug: string; lines: MegaMenuLine[] };

/** Data mega-menu: BRAND (induk) → seri device (line) → model (variant.type). */
export async function getMegaMenu(): Promise<MegaMenuBrand[]> {
  try {
    const brands = await db.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        children: {
          where: { products: { some: {} } },
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: {
            name: true,
            slug: true,
            products: { select: { coverImage: true, variants: { select: { type: true } } } },
          },
        },
      },
    });
    return brands
      .map((b) => ({
        name: b.name,
        slug: b.slug,
        lines: b.children.map((l) => {
          const models = [
            ...new Set(l.products.flatMap((p) => p.variants.map((v) => v.type.trim()).filter(Boolean))),
          ].sort((a, z) => a.localeCompare(z, "id", { numeric: true }));
          return {
            name: l.name,
            slug: l.slug,
            cover: l.products.find((p) => p.coverImage)?.coverImage ?? null,
            models,
          };
        }),
      }))
      .filter((b) => b.lines.length > 0);
  } catch {
    // DB tak terjangkau saat build → header tetap render tanpa mega-menu
    return [];
  }
}

export async function getProducts(query: ProductQuery): Promise<ProductListResult> {
  const { tipe, model, grosir, q, sort, skip, take } = query;

  const products = await db.product.findMany({
    where: {
      // tipe cocok bila slug = line ITU atau slug = brand induknya (brand → semua line-nya)
      ...(tipe
        ? { OR: [{ category: { slug: tipe } }, { category: { parent: { slug: tipe } } }] }
        : {}),
      // model tingkat 3: produk punya varian dengan type persis
      ...(model ? { variants: { some: { type: model } } } : {}),
      // hanya produk yang ditandai untuk halaman grosir
      ...(grosir ? { isGrosir: true } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
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

/** Produk yang ditandai untuk halaman /grosir (isGrosir = true). */
export async function getGrosirProducts(take = 12): Promise<ProductListItem[]> {
  try {
    const { items } = await getProducts({ grosir: true, sort: "terbaru", skip: 0, take });
    return items;
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: { orderBy: [{ color: "asc" }, { price: "asc" }] },
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
