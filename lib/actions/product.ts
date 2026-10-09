import { db } from "@/lib/db";
import { applyDiscount, activeDiscountPercent } from "@/lib/format";
import { isPlaceholderPrice, sellableStock } from "@/lib/price-guard";
import type { ProductQuery } from "@/lib/validations/product";
import { storefrontCached } from "@/lib/storefront-cache";
import { getCatalog } from "@/lib/catalog";
import { parseProductSegment, productSegment } from "@/lib/product-url";

// Catatan: harga produk = harga varian termurah. Dataset dev kecil, jadi sort by harga
// & paginasi dilakukan in-memory (konsisten lintas mode). Saat skala besar, denormalisasi
// minPrice ke kolom Product agar bisa order/paginate di DB.

export type ProductListItem = {
  id: string;
  slug: string;
  shortId: number | null; // URL: productPath() di lib/product-url.ts
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

/** Kategori "line" (tingkat 2) — dipakai chip filter di halaman /produk. */
export const getCategories = storefrontCached("categories", [] as { id: string; name: string; slug: string }[], async () => {
  // Hanya kategori PALING SPESIFIK (leaf / tanpa anak) untuk filter — buang
  // kategori broad seperti "iPhone"/"Galaxy S" yang masih punya sub-kategori.
  const cats = await db.category.findMany({
    where: { parentId: { not: null } },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
    select: { id: true, name: true, slug: true, _count: { select: { children: true } } },
  });
  return cats.filter((c) => c._count.children === 0).map(({ id, name, slug }) => ({ id, name, slug }));
});

/** Daftar brand (untuk facet filter) + apakah ada produk tanpa brand. */
export const getBrandFacets = storefrontCached("brand-facets", { brands: [] as string[], hasNoBrand: false }, async () => {
  {
    const rows = await db.product.findMany({ where: { archived: false }, select: { brand: true } });
    const set = new Set<string>();
    let hasNoBrand = false;
    for (const r of rows) {
      if (r.brand) set.add(r.brand);
      else hasNoBrand = true;
    }
    return { brands: [...set].sort((a, b) => a.localeCompare(b)), hasNoBrand };
  }
});

export type MainBanner = { id: string; image: string; href: string };

/** Ambil banner aktif per tipe, terurut. Beranda kini diatur di Konten Beranda — tersisa POPUP. */
async function getBannersByType(type: string, take?: number): Promise<MainBanner[]> {
  {
    const banners = await db.banner.findMany({
      where: { type, active: true },
      orderBy: [{ order: "asc" }],
      ...(take ? { take } : {}),
      select: { id: true, image: true, targetUrl: true },
    });
    return banners.map((b) => ({ id: b.id, image: b.image, href: b.targetUrl || "/produk" }));
  }
}

/** Banner popup awal masuk (POPUP) — ideal 1000×1000. */
export const getPopupBanner = storefrontCached("popup-banner", null as MainBanner | null, async () => {
  const banners = await getBannersByType("POPUP", 1);
  return banners[0] ?? null;
});

export type NavLinkItem = { id: string; label: string; url: string; newTab: boolean; kind: string };

/** Link menu custom aktif per lokasi (HEADER/FOOTER), terurut. */
const navLinksCached = storefrontCached("nav-links", [] as NavLinkItem[], async (location: "HEADER" | "FOOTER") =>
  db.navLink.findMany({
    where: { location, active: true },
    orderBy: [{ order: "asc" }],
    select: { id: true, label: true, url: true, newTab: true, kind: true },
  }),
);
export async function getNavLinks(location: "HEADER" | "FOOTER"): Promise<NavLinkItem[]> {
  return navLinksCached(location);
}

// Model (tingkat 3): slug != null = kategori manual → link ?tipe=slug;
// slug null = model dari variant.type → link ?tipe=line&model=label.
export type MegaMenuModel = { label: string; slug: string | null };
export type MegaMenuLine = { name: string; slug: string; cover: string | null; models: MegaMenuModel[] };
export type MegaMenuBrand = { name: string; slug: string; lines: MegaMenuLine[] };

/** Data mega-menu: BRAND (1) → seri (2) → model (3: kategori manual / variant.type). */
export const getMegaMenu = storefrontCached("mega-menu", [] as MegaMenuBrand[], async (): Promise<MegaMenuBrand[]> => {
  {
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
            // Cukup 1 foto sampul (fallback gambar seri) — dulu menarik SEMUA produk + varian tiap render.
            products: { where: { archived: false, coverImage: { not: "" } }, select: { coverImage: true }, take: 1 },
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
  }
});

// Mega menu Merek/Brands: daftar merek + beberapa produk per merek (utk panel kanan).
export type MerekMenuProduct = { id: string; slug: string; name: string; coverImage: string };
export type MerekMenuItem = { name: string; products: MerekMenuProduct[] };

export const getMerekMenu = storefrontCached("merek-menu", [] as MerekMenuItem[], async (perMerek: number = 8): Promise<MerekMenuItem[]> => {
  {
    const merek = await db.merek.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { name: true } });
    if (!merek.length) return [];
    const names = merek.map((m) => m.name);
    const products = await db.product.findMany({
      where: { archived: false, brand: { in: names }, variants: { some: { stock: { gt: 0 } } } },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, shortId: true, name: true, coverImage: true, brand: true },
      take: 600,
    });
    const byBrand = new Map<string, MerekMenuProduct[]>();
    for (const p of products) {
      if (!p.brand) continue;
      const arr = byBrand.get(p.brand) ?? [];
      if (arr.length < perMerek) arr.push({ id: p.id, slug: productSegment(p), name: p.name, coverImage: p.coverImage }); // slug = segmen URL
      byBrand.set(p.brand, arr);
    }
    return merek
      .map((m) => ({ name: m.name, products: byBrand.get(m.name) ?? [] }))
      .filter((m) => m.products.length > 0);
  }
});

/** `opts.ids` (internal, tak terbuka di /api/products): batasi ke produk tertentu, mis. halaman kampanye. */
/** Pecah kata kunci jadi kata (maks. 6, tanpa duplikat). */
function searchTerms(q: string | undefined): string[] {
  return [...new Set((q ?? "").toLowerCase().split(/\s+/).map((t) => t.trim()).filter(Boolean))].slice(0, 6);
}

export async function getProducts(query: ProductQuery, opts: { ids?: string[] } = {}): Promise<ProductListResult> {
  const { tipe, model, perangkat, brands, minPrice: priceMin, maxPrice: priceMax, grosir, featured, q, sort, skip, take } = query;

  // Dari indeks katalog ter-cache (lib/catalog.ts) — BUKAN query DB per panggilan. Semantik filter sama
  // dengan versi query Prisma sebelumnya (diuji 32 kombinasi kueri, hasil identik).
  const catalog = await getCatalog();

  // Gabungan slug perangkat: dari facet "perangkat" + tipe (link masuk). Cocok bila kategori utama/
  // tambahan produk ATAU induk/kakeknya termasuk.
  const deviceSlugs = [...new Set([...(perangkat ?? []), ...(tipe ? [tipe] : [])])];
  // Filter brand (OR antar brand); "__none__" = produk tanpa brand.
  const brandNames = (brands ?? []).filter((b) => b !== "__none__");
  const wantNoBrand = (brands ?? []).includes("__none__");
  // Pencarian per kata (bukan frasa utuh): "snapfit s26" cocok dgn "SNAPFIT Case … Galaxy S26".
  // Tiap kata harus ada di nama, merek, atau nama/tipe salah satu varian (huruf besar/kecil bebas).
  const terms = searchTerms(q);
  const idSet = opts.ids ? new Set(opts.ids) : null;

  const products = catalog
    .filter((p) => !idSet || idSet.has(p.id))
    .filter((p) => !deviceSlugs.length || deviceSlugs.some((d) => p.deviceSlugs.includes(d)))
    .filter((p) => !brands?.length || (p.brand ? brandNames.includes(p.brand) : wantNoBrand))
    .filter((p) => terms.every((t) => p.haystack.includes(t)))
    .filter((p) => !model || p.variantTypes.includes(model))
    .filter((p) => !grosir || p.isGrosir)
    .filter((p) => !featured || p.featured)
    .map((p) => ({
      ...p,
      reviews: { sum: p.ratingSum, count: p.ratingCount },
      category: p.categorySlug ? { name: p.categoryName ?? "", slug: p.categorySlug } : null,
      variants: p.variants.map((v) => ({
        ...v,
        discounts: v.discounts.map((d) => ({ ...d, startAt: d.startAt == null ? null : new Date(d.startAt), endAt: d.endAt == null ? null : new Date(d.endAt) })),
      })),
    }));

  const mapped: ProductListItem[] = products
    // Varian berharga placeholder (Rp999.999 dst) dianggap tak tersedia.
    .map((p) => ({ ...p, variants: p.variants.filter((v) => !isPlaceholderPrice(v.price)) }))
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
      const ratingCount = p.reviews.count;
      const ratingAvg = ratingCount ? p.reviews.sum / ratingCount : 0;
      return {
        id: p.id,
        slug: p.slug,
        shortId: p.shortId,
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

/**
 * Produk kampanye (/promo/[slug]) dari diskon berlabel kampanye:
 * - live: diskon aktif yang sedang berlaku → harga kartu sudah terdiskon
 * - upcoming: diskon terjadwal berikutnya (bocoran) → harga masih normal
 */
export async function getCampaignProducts(campaign: string): Promise<{
  live: ProductListItem[];
  livePercent: number;
  liveEndsAt: Date | null;
  upcoming: ProductListItem[];
  upcomingPercent: number;
  upcomingStartsAt: Date | null;
}> {
  const now = new Date();
  const discounts = await db.discount.findMany({
    where: { campaign, active: true, OR: [{ endAt: null }, { endAt: { gt: now } }] },
    select: { percent: true, startAt: true, endAt: true, variants: { select: { productId: true } } },
    orderBy: { startAt: "asc" },
  });
  const isLive = (d: (typeof discounts)[number]) => !d.startAt || d.startAt <= now;
  const live = discounts.filter(isLive);
  const next = discounts.filter((d) => !isLive(d));
  const firstStart = next[0]?.startAt ?? null;
  const nextBatch = next.filter((d) => d.startAt?.getTime() === firstStart?.getTime());
  const ids = (ds: typeof discounts) => [...new Set(ds.flatMap((d) => d.variants.map((v) => v.productId)))];
  const list = async (ds: typeof discounts) =>
    ds.length ? (await getProducts({ sort: "terbaru", skip: 0, take: 48 }, { ids: ids(ds) })).items : [];
  const [liveItems, upcomingItems] = await Promise.all([list(live), list(nextBatch)]);
  const ends = live.map((d) => d.endAt).filter((d): d is Date => !!d);
  return {
    live: liveItems.sort((a, b) => b.discountPercent - a.discountPercent),
    livePercent: Math.max(0, ...live.map((d) => d.percent)),
    liveEndsAt: ends.length ? new Date(Math.min(...ends.map((d) => d.getTime()))) : null,
    upcoming: upcomingItems,
    upcomingPercent: Math.max(0, ...nextBatch.map((d) => d.percent)),
    upcomingStartsAt: firstStart,
  };
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

const PDP_INCLUDE = {
  category: { select: { name: true, slug: true } },
  variants: {
    orderBy: [{ color: "asc" as const }, { price: "asc" as const }],
    include: { discounts: { select: { percent: true, active: true, startAt: true, endAt: true } } },
  },
};

/**
 * Cari produk dari segmen URL /produk/<segmen>. Hasil `canonical` = segmen kanonik
 * (<slug>-<shortId>); bila ≠ segmen yang diminta → halaman mengalihkan 301 ke kanonik.
 * Urutan: (a) segmen kanonik persis → (b) slug/slug lama persis (URL lama, sebelum format ID)
 * → (c) ID cocok tapi teks lama (judul sudah diganti). Tak ketemu / diarsipkan → null (404).
 */
export async function getProductBySegment(segment: string) {
  const { id } = parseProductSegment(segment);
  const byId = id ? await db.product.findFirst({ where: { shortId: id }, include: PDP_INCLUDE }) : null;
  let product = byId && productSegment(byId) === segment ? byId : null;
  if (!product) {
    product =
      (await db.product.findFirst({ where: { OR: [{ slug: segment }, { legacySlug: segment }] }, include: PDP_INCLUDE })) ?? byId;
  }
  if (!product || product.archived) return null;
  return { product: withVariantPricing(product), canonical: productSegment(product) };
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
  if (!product || product.archived) return null; // diarsipkan → 404
  return withVariantPricing(product);
}

type PdpRaw = NonNullable<Awaited<ReturnType<typeof db.product.findFirst<{ include: typeof PDP_INCLUDE }>>>>;

function withVariantPricing(product: PdpRaw) {
  // Diskon PER-VARIAN → tiap varian bawa discountPercent-nya sendiri.
  const variants = product.variants.map((v) => ({
    ...v,
    stock: sellableStock(v), // harga placeholder → tampil "habis" (tak bisa dibeli)
    discountPercent: activeDiscountPercent(v.discounts),
  }));
  const maxPercent = variants.reduce((m, v) => Math.max(m, v.discountPercent), 0);
  return { ...product, variants, discountPercent: maxPercent };
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;

export async function getProductReviews(productId: string) {
  const reviews = await db.review.findMany({
    where: { productId, approved: true }, // ulasan pembeli tampil setelah dimoderasi
    orderBy: { createdAt: "desc" },
    select: { id: true, author: true, image: true, rating: true, comment: true, createdAt: true, verified: true, photo: true },
  });
  return reviews.map((r) => ({
    id: r.id,
    author: r.author,
    image: r.image,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    verified: r.verified,
    photo: r.photo,
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
