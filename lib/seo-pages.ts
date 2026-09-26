import { cache } from "react";
import { db } from "@/lib/db";
import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { slugify, HIDDEN_MEREK } from "@/lib/slug";

/**
 * Halaman landing SEO:
 *   /kategori/[slug] — per perangkat (Apple › iPhone › iPhone 18 Series)
 *   /merek/[slug]    — per merek aksesori (Ringke, VRS Design, SNAPFIT, …)
 * Isi produk memakai getProducts (sudah menyaring stok habis).
 */

export { slugify };

const MAX_ITEMS = 200;

export type Crumb = { name: string; href: string };
export type CategoryLanding = {
  name: string;
  slug: string;
  level: number; // 1 brand HP · 2 seri · 3 model
  crumbs: Crumb[]; // leluhur (tanpa diri sendiri)
  children: { name: string; slug: string; count: number }[];
  items: ProductListItem[];
  total: number;
};

async function countFor(slug: string): Promise<number> {
  const r = await getProducts({ tipe: slug, sort: "terbaru", skip: 0, take: 1 });
  return r.total;
}

// cache(): generateMetadata + halaman memakai hasil query yang sama (1x per request).
export const getCategoryLanding = cache(async (slug: string): Promise<CategoryLanding | null> => {
  const cat = await db.category.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      parent: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      children: { select: { name: true, slug: true }, orderBy: [{ order: "asc" }, { name: "asc" }] },
    },
  });
  if (!cat) return null;

  const crumbs: Crumb[] = [];
  if (cat.parent?.parent) crumbs.push({ name: cat.parent.parent.name, href: `/kategori/${cat.parent.parent.slug}` });
  if (cat.parent) crumbs.push({ name: cat.parent.name, href: `/kategori/${cat.parent.slug}` });

  const [list, children] = await Promise.all([
    getProducts({ tipe: slug, sort: "terbaru", skip: 0, take: MAX_ITEMS }),
    Promise.all(cat.children.map(async (c) => ({ ...c, count: await countFor(c.slug) }))),
  ]);

  return {
    name: cat.name,
    slug: cat.slug,
    level: crumbs.length + 1,
    crumbs,
    children: children.filter((c) => c.count > 0),
    items: list.items,
    total: list.total,
  };
});

export type MerekLanding = { name: string; slug: string; items: ProductListItem[]; total: number };

export const getMerekLanding = cache(async (slug: string): Promise<MerekLanding | null> => {
  if (HIDDEN_MEREK.has(slug)) return null;
  const mereks = await db.merek.findMany({ select: { name: true } });
  const m = mereks.find((x) => slugify(x.name) === slug);
  if (!m) return null;
  const list = await getProducts({ brands: [m.name], sort: "terbaru", skip: 0, take: MAX_ITEMS });
  return { name: m.name, slug, items: list.items, total: list.total };
});

/**
 * Semua halaman landing yang punya produk tersedia — untuk sitemap.
 * SATU query (bukan per kategori/merek): puluhan query paralel melebihi batas
 * koneksi DB serverless saat build → sitemap kosong.
 */
export async function listLandingPages(): Promise<{ categories: string[]; mereks: string[] }> {
  const up = { select: { slug: true, parent: { select: { slug: true, parent: { select: { slug: true } } } } } };
  const [products, mereks] = await Promise.all([
    db.product.findMany({
      where: { variants: { some: { stock: { gt: 0 } } } },
      select: { brand: true, category: up, extraCategories: up },
    }),
    db.merek.findMany({ select: { name: true } }),
  ]);
  type C = { slug: string; parent: { slug: string; parent: { slug: string } | null } | null } | null;
  const cats = new Set<string>();
  const add = (c: C) => {
    if (!c) return;
    cats.add(c.slug);
    if (c.parent) cats.add(c.parent.slug);
    if (c.parent?.parent) cats.add(c.parent.parent.slug);
  };
  const brands = new Set<string>();
  for (const p of products) {
    add(p.category);
    p.extraCategories.forEach(add);
    if (p.brand) brands.add(p.brand);
  }
  return {
    categories: [...cats],
    mereks: mereks.filter((m) => brands.has(m.name) && !HIDDEN_MEREK.has(slugify(m.name))).map((m) => slugify(m.name)),
  };
}

/** Judul SEO kategori: level 1 = "Case & Aksesoris Apple", lainnya "Case iPhone 18 Series". */
export function categoryTitle(name: string, level: number): string {
  return level === 1 ? `Case & Aksesoris ${name} Original` : `Case ${name} Original`;
}
