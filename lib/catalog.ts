// Indeks katalog toko (server): SATU query untuk semua produk aktif, di-cache di Vercel Data Cache.
// Dulu getProducts() menarik seluruh katalog + varian + diskon + ulasan dari DB di SETIAP panggilan
// (tiap filter/kata kunci/halaman berbeda) → penyumbang egress Supabase terbesar & celah DoS.
// Sekarang filter/cari/urut/halaman dihitung di memori dari indeks ini (lib/actions/product.ts).
// Segar: tiap 5 menit, atau langsung via revalidateTag(CATALOG_TAG / STOREFRONT_TAG) saat produk,
// stok (pembayaran, batal, sinkron Ginee) atau diskon berubah.
import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";

export const CATALOG_TAG = "catalog";

export type CatalogDiscount = { percent: number; active: boolean; startAt: number | null; endAt: number | null };
export type CatalogVariant = { id: string; name: string; image: string; price: number; stock: number; discounts: CatalogDiscount[] };
export type CatalogEntry = {
  id: string;
  slug: string;
  shortId: number | null;
  name: string;
  brand: string | null;
  coverImage: string;
  createdAt: number;
  featured: boolean;
  isGrosir: boolean;
  categoryName: string | null;
  categorySlug: string | null;
  /** Slug kategori utama & tambahan + induk + kakeknya (filter perangkat/tipe). */
  deviceSlugs: string[];
  /** Tipe varian persis (filter model tingkat 3). */
  variantTypes: string[];
  /** Teks cari huruf kecil: nama, merek, nama & tipe SEMUA varian — dipisah \u0000 (kata tak menyeberang kolom). */
  haystack: string;
  ratingSum: number;
  ratingCount: number;
  variants: CatalogVariant[];
};

const ms = (d: Date | null) => (d ? d.getTime() : null);
type CatRef = { slug: string; parent: { slug: string; parent: { slug: string } | null } | null } | null;
const catSlugs = (c: CatRef) => (c ? [c.slug, c.parent?.slug, c.parent?.parent?.slug].filter((s): s is string => !!s) : []);
const CAT_SELECT = { slug: true, parent: { select: { slug: true, parent: { select: { slug: true } } } } } as const;

async function loadCatalog(): Promise<CatalogEntry[]> {
  const rows = await db.product.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, shortId: true, name: true, brand: true, coverImage: true, createdAt: true,
      featured: true, isGrosir: true,
      category: { select: { name: true, ...CAT_SELECT } },
      extraCategories: { select: CAT_SELECT },
      reviews: { where: { approved: true }, select: { rating: true } },
      variants: {
        orderBy: { id: "asc" }, // urutan tetap → varian default kartu (termurah, bila seri) konsisten
        select: {
          id: true, name: true, type: true, image: true, price: true, stock: true,
          discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
        },
      },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    shortId: p.shortId,
    name: p.name,
    brand: p.brand ?? null,
    coverImage: p.coverImage,
    createdAt: p.createdAt.getTime(),
    featured: p.featured,
    isGrosir: p.isGrosir,
    categoryName: p.category?.name ?? null,
    categorySlug: p.category?.slug ?? null,
    deviceSlugs: [...new Set([...catSlugs(p.category), ...p.extraCategories.flatMap(catSlugs)])],
    variantTypes: [...new Set(p.variants.map((v) => v.type))],
    haystack: [p.name, p.brand ?? "", ...p.variants.flatMap((v) => [v.name, v.type])].join("\u0000").toLowerCase(),
    ratingSum: p.reviews.reduce((s, r) => s + r.rating, 0),
    ratingCount: p.reviews.length,
    variants: p.variants.map((v) => ({
      id: v.id,
      name: v.name,
      image: v.image,
      price: v.price,
      stock: v.stock,
      discounts: v.discounts.map((d) => ({ percent: d.percent, active: d.active, startAt: ms(d.startAt), endAt: ms(d.endAt) })),
    })),
  }));
}

const cachedCatalog = unstable_cache(loadCatalog, ["catalog-index-v1"], { revalidate: 300, tags: [CATALOG_TAG, STOREFRONT_TAG] });

/** Semua produk aktif (tak diarsip), terbaru dulu. Error DB dilempar (bukan disembunyikan). */
export function getCatalog(): Promise<CatalogEntry[]> {
  return cachedCatalog();
}
