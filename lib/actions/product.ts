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
  brand: string | null;
  coverImage: string;
  categoryName: string | null;
  categorySlug: string | null;
  minPrice: number;
  finalPrice: number; // setelah diskon aktif
  discountPercent: number; // 0 jika tak ada
  inStock: boolean;
  ratingAvg: number; // rata-rata bintang (0 jika belum ada ulasan)
  ratingCount: number; // jumlah ulasan
  variantCount: number; // jumlah varian in-stock (utk tombol add-to-cart di kartu)
  defaultVariant: { id: string; name: string; image: string; price: number } | null; // varian termurah in-stock
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
  // Hanya kategori PALING SPESIFIK (leaf / tanpa anak) untuk filter — buang
  // kategori broad seperti "iPhone"/"Galaxy S" yang masih punya sub-kategori.
  const cats = await db.category.findMany({
    where: { parentId: { not: null } },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    select: { id: true, name: true, slug: true, _count: { select: { children: true } } },
  });
  return cats.filter((c) => c._count.children === 0).map(({ id, name, slug }) => ({ id, name, slug }));
}

/** Daftar brand (untuk facet filter) + apakah ada produk tanpa brand. */
export async function getBrandFacets(): Promise<{ brands: string[]; hasNoBrand: boolean }> {
  try {
    const rows = await db.product.findMany({ select: { brand: true } });
    const set = new Set<string>();
    let hasNoBrand = false;
    for (const r of rows) {
      if (r.brand) set.add(r.brand);
      else hasNoBrand = true;
    }
    return { brands: [...set].sort((a, b) => a.localeCompare(b)), hasNoBrand };
  } catch {
    return { brands: [], hasNoBrand: false };
  }
}

export type DeviceModel = { label: string; slug: string; count: number };
export type DeviceLine = { name: string; slug: string; productCount: number; models: DeviceModel[] };
export type DeviceBrand = { name: string; slug: string; lines: DeviceLine[] };

/**
 * Pohon pemilih perangkat homepage (drill-down 3 tingkat) — MENGIKUTI pohon
 * kategori yang dikelola di Admin → Kategori (Brand → Seri → Model).
 * Jumlah produk dihitung lintas-subtree (kategori utama + tambahan). Hanya
 * kategori yang punya produk yang ditampilkan.
 */
export async function getDeviceTree(): Promise<DeviceBrand[]> {
  try {
    const brands = await db.category.findMany({
      where: { parentId: null },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, slug: true,
        children: {
          orderBy: [{ order: "asc" }, { name: "asc" }],
          select: {
            id: true, name: true, slug: true,
            children: {
              orderBy: [{ order: "asc" }, { name: "asc" }],
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    // Peta induk (utk rambat hitung ke leluhur).
    const parentOf = new Map<string, string | null>();
    for (const b of brands) {
      parentOf.set(b.id, null);
      for (const l of b.children) {
        parentOf.set(l.id, b.id);
        for (const m of l.children) parentOf.set(m.id, l.id);
      }
    }

    // Hitung produk per kategori: tiap produk menyumbang ke kategori utama +
    // tambahan DAN semua leluhurnya (dedup per produk).
    const products = await db.product.findMany({
      select: { categoryId: true, extraCategories: { select: { id: true } } },
    });
    const count = new Map<string, number>();
    for (const p of products) {
      const ids = new Set<string>();
      const seeds = [p.categoryId, ...p.extraCategories.map((e) => e.id)].filter(Boolean) as string[];
      for (const s of seeds) {
        let cur: string | null | undefined = s;
        while (cur) {
          ids.add(cur);
          cur = parentOf.get(cur);
        }
      }
      for (const id of ids) count.set(id, (count.get(id) ?? 0) + 1);
    }
    const cnt = (id: string) => count.get(id) ?? 0;

    // Tampilkan SEMUA kategori (mirror Admin → Kategori), walau belum ada produk.
    return brands
      .map((b) => ({
        name: b.name,
        slug: b.slug,
        lines: b.children.map((l) => ({
          name: l.name,
          slug: l.slug,
          productCount: cnt(l.id),
          models: l.children.map((m) => ({ label: m.name, slug: m.slug, count: cnt(m.id) })),
        })),
      }))
      .filter((b) => b.lines.length > 0);
  } catch {
    return [];
  }
}

export type MainBanner = { id: string; image: string; href: string };

/** Ambil banner aktif per tipe (MAIN/PROMO/ETALASE), terurut. */
async function getBannersByType(type: string, take?: number): Promise<MainBanner[]> {
  try {
    const banners = await db.banner.findMany({
      where: { type, active: true },
      orderBy: [{ order: "asc" }],
      ...(take ? { take } : {}),
      select: { id: true, image: true, targetUrl: true },
    });
    return banners.map((b) => ({ id: b.id, image: b.image, href: b.targetUrl || "/produk" }));
  } catch {
    return [];
  }
}

/** Banner hero (MAIN) — ideal 1200×600. */
export function getMainBanners() {
  return getBannersByType("MAIN");
}
/** 2 banner kotak (PROMO) — ideal 1000×1000. */
export function getPromoBanners() {
  return getBannersByType("PROMO", 2);
}
/** Banner strip panjang (ETALASE) — ideal 2000×400 landscape. */
export function getStripBanners() {
  return getBannersByType("ETALASE", 1);
}
/** Banner popup awal masuk (POPUP) — ideal 1000×1000. */
export async function getPopupBanner(): Promise<MainBanner | null> {
  const banners = await getBannersByType("POPUP", 1);
  return banners[0] ?? null;
}

export type NavLinkItem = { id: string; label: string; url: string; newTab: boolean; kind: string };

/** Link menu custom aktif per lokasi (HEADER/FOOTER), terurut. */
export async function getNavLinks(location: "HEADER" | "FOOTER"): Promise<NavLinkItem[]> {
  try {
    const links = await db.navLink.findMany({
      where: { location, active: true },
      orderBy: [{ order: "asc" }],
      select: { id: true, label: true, url: true, newTab: true, kind: true },
    });
    return links;
  } catch {
    return [];
  }
}

// Model (tingkat 3): slug != null = kategori manual → link ?tipe=slug;
// slug null = model dari variant.type → link ?tipe=line&model=label.
export type MegaMenuModel = { label: string; slug: string | null };
export type MegaMenuLine = { name: string; slug: string; cover: string | null; models: MegaMenuModel[] };
export type MegaMenuBrand = { name: string; slug: string; lines: MegaMenuLine[] };

/** Data mega-menu: BRAND (1) → seri (2) → model (3: kategori manual / variant.type). */
export async function getMegaMenu(): Promise<MegaMenuBrand[]> {
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
            image: true,
            // tingkat 3: kategori model manual
            children: {
              orderBy: [{ order: "asc" }, { name: "asc" }],
              select: { name: true, slug: true },
            },
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
          // Model = HANYA kategori tingkat-3 manual (kelola di Admin → Kategori).
          // Tak lagi fallback ke variant.type (menghindari nama warna/finish muncul).
          const models: MegaMenuModel[] = l.children.map((c) => ({ label: c.name, slug: c.slug }));
          return {
            name: l.name,
            slug: l.slug,
            cover: l.image || l.products.find((p) => p.coverImage)?.coverImage || null,
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

// Mega menu Merek/Brands: daftar merek + beberapa produk per merek (utk panel kanan).
export type MerekMenuProduct = { id: string; slug: string; name: string; coverImage: string };
export type MerekMenuItem = { name: string; products: MerekMenuProduct[] };

export async function getMerekMenu(perMerek = 8): Promise<MerekMenuItem[]> {
  try {
    const merek = await db.merek.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { name: true } });
    if (!merek.length) return [];
    const names = merek.map((m) => m.name);
    const products = await db.product.findMany({
      where: { brand: { in: names }, variants: { some: { stock: { gt: 0 } } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, name: true, coverImage: true, brand: true },
      take: 600,
    });
    const byBrand = new Map<string, MerekMenuProduct[]>();
    for (const p of products) {
      if (!p.brand) continue;
      const arr = byBrand.get(p.brand) ?? [];
      if (arr.length < perMerek) arr.push({ id: p.id, slug: p.slug, name: p.name, coverImage: p.coverImage });
      byBrand.set(p.brand, arr);
    }
    return merek
      .map((m) => ({ name: m.name, products: byBrand.get(m.name) ?? [] }))
      .filter((m) => m.products.length > 0);
  } catch {
    return [];
  }
}

export async function getProducts(query: ProductQuery): Promise<ProductListResult> {
  const { tipe, model, perangkat, brands, minPrice: priceMin, maxPrice: priceMax, grosir, featured, q, sort, skip, take } = query;

  // Gabungan slug perangkat: dari facet "perangkat" + tipe (link masuk).
  const deviceSlugs = [...new Set([...(perangkat ?? []), ...(tipe ? [tipe] : [])])];
  const deviceWhere = deviceSlugs.length
    ? {
        OR: [
          { category: { slug: { in: deviceSlugs } } },
          { category: { parent: { slug: { in: deviceSlugs } } } },
          { category: { parent: { parent: { slug: { in: deviceSlugs } } } } },
          { extraCategories: { some: { slug: { in: deviceSlugs } } } },
          { extraCategories: { some: { parent: { slug: { in: deviceSlugs } } } } },
          { extraCategories: { some: { parent: { parent: { slug: { in: deviceSlugs } } } } } },
        ],
      }
    : null;

  // Filter brand (OR antar brand); "__none__" = produk tanpa brand.
  const brandNames = (brands ?? []).filter((b) => b !== "__none__");
  const wantNoBrand = (brands ?? []).includes("__none__");
  const brandWhere =
    brands && brands.length
      ? {
          OR: [
            ...(brandNames.length ? [{ brand: { in: brandNames } }] : []),
            ...(wantNoBrand ? [{ brand: null }] : []),
          ],
        }
      : null;

  const products = await db.product.findMany({
    where: {
      // Facet perangkat + brand digabung dengan AND (antar-facet = irisan;
      // dalam facet = OR, sudah dibungkus di deviceWhere/brandWhere).
      ...((deviceWhere || brandWhere)
        ? { AND: [...(deviceWhere ? [deviceWhere] : []), ...(brandWhere ? [brandWhere] : [])] }
        : {}),
      // model tingkat 3: produk punya varian dengan type persis
      ...(model ? { variants: { some: { type: model } } } : {}),
      // hanya produk yang ditandai untuk halaman grosir
      ...(grosir ? { isGrosir: true } : {}),
      // hanya produk unggulan (homepage)
      ...(featured ? { featured: true } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    include: {
      category: { select: { name: true, slug: true } },
      reviews: { select: { rating: true } },
      variants: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          stock: true,
          discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped: ProductListItem[] = products
    // Sembunyikan produk stok habis dari daftar (semua varian stok 0).
    .filter((p) => p.variants.some((v) => v.stock > 0))
    .map((p) => {
      // Diskon per-varian: harga akhir tiap varian dihitung sendiri.
      const priced = p.variants.map((v) => {
        const pct = activeDiscountPercent(v.discounts);
        return { v, price: v.price, final: applyDiscount(v.price, pct), pct };
      });
      const minPrice = Math.min(...priced.map((x) => x.price));
      const cheapest = priced.reduce((a, b) => (b.final < a.final ? b : a));
      // Varian in-stock termurah → default untuk tombol add-to-cart di kartu.
      const inStockPriced = priced.filter((x) => x.v.stock > 0);
      const cheapestInStock = (inStockPriced.length ? inStockPriced : priced).reduce((a, b) => (b.final < a.final ? b : a));
      const variantCount = p.variants.filter((v) => v.stock > 0).length;
      const ratingCount = p.reviews.length;
      const ratingAvg = ratingCount ? p.reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : 0;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand ?? null,
        coverImage: p.coverImage,
        categoryName: p.category?.name ?? null,
        categorySlug: p.category?.slug ?? null,
        minPrice,
        finalPrice: cheapest.final, // harga termurah setelah diskon per-varian
        discountPercent: cheapest.pct, // diskon pada varian termurah (utk badge)
        inStock: p.variants.some((v) => v.stock > 0),
        ratingAvg,
        ratingCount,
        variantCount,
        defaultVariant: {
          id: cheapestInStock.v.id,
          name: cheapestInStock.v.name,
          image: cheapestInStock.v.image,
          price: cheapestInStock.final,
        },
      };
    });

  // Filter harga (pada harga akhir termurah yang ditampilkan).
  const priceFiltered = mapped.filter(
    (p) => (priceMin == null || p.finalPrice >= priceMin) && (priceMax == null || p.finalPrice <= priceMax),
  );

  if (sort === "termurah") priceFiltered.sort((a, b) => a.finalPrice - b.finalPrice);
  else if (sort === "termahal") priceFiltered.sort((a, b) => b.finalPrice - a.finalPrice);
  // "terbaru" sudah terurut createdAt desc dari DB

  const total = priceFiltered.length;
  const items = priceFiltered.slice(skip, skip + take);
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

/** Produk unggulan (dipilih admin). Fallback ke produk terbaru bila belum ada yang dipilih. */
export async function getFeaturedProducts(take = 8): Promise<ProductListItem[]> {
  try {
    const { items } = await getProducts({ featured: true, sort: "terbaru", skip: 0, take });
    if (items.length) return items;
    const fallback = await getProducts({ sort: "terbaru", skip: 0, take: 4 });
    return fallback.items;
  } catch {
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        orderBy: [{ color: "asc" }, { price: "asc" }],
        include: { discounts: { select: { percent: true, active: true, startAt: true, endAt: true } } },
      },
    },
  });
  if (!product) return null;

  // Diskon PER-VARIAN → tiap varian bawa discountPercent-nya sendiri.
  const variants = product.variants.map((v) => ({
    ...v,
    discountPercent: activeDiscountPercent(v.discounts),
  }));
  const maxPercent = variants.reduce((m, v) => Math.max(m, v.discountPercent), 0);
  return { ...product, variants, discountPercent: maxPercent };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getProductReviews(productId: string) {
  const reviews = await db.review.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    select: { id: true, author: true, image: true, rating: true, comment: true, createdAt: true },
  });
  return reviews.map((r) => ({
    id: r.id,
    author: r.author,
    image: r.image,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }));
}

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
