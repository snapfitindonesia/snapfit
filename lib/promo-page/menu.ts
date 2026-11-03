// Menu halaman /buy1get1 KHUSUS produk promo, dibangun dari JUDUL produk promo (lib/promo-page/devices.ts):
// merek → lini → model, hanya yang benar-benar punya produk promo. Produk Buy 1 Get 1 (impor Shopee) umumnya tanpa
// kategori & untuk perangkat lama yang tak ada di Admin → Kategori, jadi menu tak memakai pohon kategori.
// Segmen paket = merek perangkat, sidebar = lini, isi = model. Semua tautan menyaring produk di halaman ini
// (lib/promo-page/filter.ts), bukan ke /kategori atau /produk.
import type { PromoPageConfig } from "@/lib/promo-page/config";
import { inferDevices } from "@/lib/promo-page/devices";
import { filterHref, matchesFilter, type PromoItemMeta } from "@/lib/promo-page/filter";

export type MenuLink = { label: string; href: string };
export type MenuGroup = { title: string; links: MenuLink[]; isNew?: boolean };
export type MenuCategory = { name: string; href: string; groups: MenuGroup[] };
export type MenuSegment = {
  id: string;
  label: string;
  href: string;
  image: string; // foto merek (dashboard) → sampul produk promo pertama merek itu → placeholder (di komponen)
  caption: string;
  categories: MenuCategory[]; // [Rekomendasi, ...lini]
  seriesTitle: string;
  series: MenuLink[];
};
/** labels: slug saringan → nama (judul saringan aktif). */
export type PromoMenu = { segments: MenuSegment[]; suggestions: MenuLink[]; labels: Record<string, string> };
/** Produk promo untuk menu: data saring + judul (sumber merek/lini/model) + foto sampul. */
export type PromoMenuItem = PromoItemMeta & { name: string; image: string };

const kat = (slug: string, q?: string) => filterHref({ kat: slug, q });
// Jenis produk → kata kunci pencarian (nama produk/varian).
const PRODUCT_TYPES: [label: string, q: string][] = [
  ["Case", "case"],
  ["Tempered glass", "tempered glass"],
  ["Pelindung kamera", "lens"],
  ["Back glass", "back glass"],
];

type Model = { slug: string; name: string; order: number; count: number };
type Line = { slug: string; name: string; count: number; models: Map<string, Model> };
type Brand = { slug: string; name: string; count: number; image: string; lines: Map<string, Line> };

export function getPromoMenu(config: PromoPageConfig, items: PromoMenuItem[]): PromoMenu {
  const has = (slug: string, q?: string) => items.some((i) => matchesFilter(i, { kat: slug, q }));
  const types = (slug: string, scope: string) =>
    PRODUCT_TYPES.filter(([, q]) => has(slug, q)).map(([label, q]) => ({ label: `${label} ${scope}`, href: kat(slug, q) }));
  const nonEmpty = (groups: MenuGroup[]) => groups.filter((g) => g.links.length);

  // Pohon merek → lini → model + jumlah produk (urutan menu: terbanyak dulu; model terbaru dulu).
  const tree = new Map<string, Brand>();
  for (const it of items) {
    const devices = inferDevices(it.name);
    const seenBrand = new Set<string>();
    const seenLine = new Set<string>();
    for (const d of devices) {
      let b = tree.get(d.brand.slug);
      if (!b) tree.set(d.brand.slug, (b = { ...d.brand, count: 0, image: it.image, lines: new Map() }));
      if (!seenBrand.has(b.slug)) {
        seenBrand.add(b.slug);
        b.count++;
      }
      let l = b.lines.get(d.line.slug);
      if (!l) b.lines.set(d.line.slug, (l = { ...d.line, count: 0, models: new Map() }));
      if (!seenLine.has(l.slug)) {
        seenLine.add(l.slug);
        l.count++;
      }
      if (d.model) {
        const m = l.models.get(d.model.slug) ?? { ...d.model, count: 0 };
        m.count++;
        l.models.set(m.slug, m);
      }
    }
  }
  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;
  const brands = [...tree.values()].sort(byCount).map((b) => ({
    ...b,
    lines: [...b.lines.values()].sort(byCount).map((l) => ({
      ...l,
      models: [...l.models.values()].sort((x, y) => y.order - x.order || byCount(x, y) || x.name.localeCompare(y.name)),
    })),
  }));

  const segments: MenuSegment[] = brands.map((b) => {
    const series = b.lines.map((l) => ({ label: l.name, href: kat(l.slug) }));
    return {
      id: b.slug,
      label: b.name,
      href: kat(b.slug),
      image: config.categories.images[b.slug] || b.image,
      caption: `Produk Buy 1 Get 1 untuk ${b.name}.`,
      categories: [
        {
          name: "Rekomendasi",
          href: kat(b.slug),
          groups: nonEmpty([
            { title: "Seri", links: series.slice(0, 8) },
            { title: "Jenis produk", links: types(b.slug, b.name), isNew: true },
          ]),
        },
        ...b.lines.map((l) => ({
          name: l.name,
          href: kat(l.slug),
          groups: nonEmpty([
            { title: "Pilih tipe", links: l.models.length ? l.models.map((m) => ({ label: m.name, href: kat(m.slug) })) : [{ label: `Semua ${l.name}`, href: kat(l.slug) }] },
            { title: "Jenis produk", links: types(l.slug, l.name) },
          ]),
        })),
      ],
      seriesTitle: `Seri ${b.name}`,
      series,
    };
  });

  const labels: Record<string, string> = {};
  const suggestions: MenuLink[] = [];
  for (const b of brands) {
    labels[b.slug] = b.name;
    suggestions.push({ label: b.name, href: kat(b.slug) });
    for (const l of b.lines) {
      labels[l.slug] = l.name;
      suggestions.push({ label: l.name, href: kat(l.slug) });
      for (const m of l.models) {
        labels[m.slug] = m.name;
        suggestions.push({ label: m.name, href: kat(m.slug) });
      }
    }
  }
  return { segments, suggestions: [...new Map(suggestions.map((s) => [s.label.toLowerCase(), s])).values()], labels };
}
