// Menu halaman /buy1get1 KHUSUS produk promo: dari pohon kategori asli (Admin → Kategori) tetapi hanya merek/seri/
// model yang punya produk promo. Segmen paket (Wanita/Pria/…) = merek perangkat, sidebar = seri, isi = model.
// Semua tautan menyaring produk di halaman ini (lib/promo-page/filter.ts), bukan ke /kategori atau /produk.
import { getMegaMenu } from "@/lib/actions/product";
import type { PromoPageConfig } from "@/lib/promo-page/config";
import { filterHref, matchesFilter, type PromoItemMeta } from "@/lib/promo-page/filter";

export type MenuLink = { label: string; href: string };
export type MenuGroup = { title: string; links: MenuLink[]; isNew?: boolean };
export type MenuCategory = { name: string; href: string; groups: MenuGroup[] };
export type MenuSegment = {
  id: string;
  label: string;
  href: string;
  image: string; // foto kartu kategori (dashboard) → sampul seri pertama → placeholder (di komponen)
  caption: string;
  categories: MenuCategory[]; // [Rekomendasi, ...seri]
  seriesTitle: string;
  series: MenuLink[];
};
/** labels: slug kategori → nama (judul saringan aktif). */
export type PromoMenu = { segments: MenuSegment[]; suggestions: MenuLink[]; labels: Record<string, string> };

const kat = (slug: string, q?: string) => filterHref({ kat: slug, q });
// Jenis produk → kata kunci pencarian (nama produk/varian).
const PRODUCT_TYPES: [label: string, q: string][] = [
  ["Case", "case"],
  ["Tempered glass", "tempered glass"],
  ["Pelindung kamera", "lens"],
  ["Back glass", "back glass"],
];

export async function getPromoMenu(config: PromoPageConfig, items: PromoItemMeta[]): Promise<PromoMenu> {
  const has = (slug: string, q?: string) => items.some((i) => matchesFilter(i, { kat: slug, q }));
  const types = (slug: string, scope: string) =>
    PRODUCT_TYPES.filter(([, q]) => has(slug, q)).map(([label, q]) => ({ label: `${label} ${scope}`, href: kat(slug, q) }));
  const nonEmpty = (groups: MenuGroup[]) => groups.filter((g) => g.links.length);

  const brands = (await getMegaMenu())
    .filter((b) => has(b.slug))
    .map((b) => ({
      ...b,
      lines: b.lines.filter((l) => has(l.slug)).map((l) => ({ ...l, models: l.models.filter((m) => m.slug && has(m.slug)) })),
    }));

  const segments: MenuSegment[] = brands.map((b) => {
    const series = b.lines.map((l) => ({ label: l.name, href: kat(l.slug) }));
    return {
      id: b.slug,
      label: b.name,
      href: kat(b.slug),
      image: config.categories.images[b.slug] || b.lines.find((l) => l.cover)?.cover || "",
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
            { title: "Pilih tipe", links: l.models.length ? l.models.map((m) => ({ label: m.label, href: kat(m.slug!) })) : [{ label: `Semua ${l.name}`, href: kat(l.slug) }] },
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
        labels[m.slug!] = m.label;
        suggestions.push({ label: m.label, href: kat(m.slug!) });
      }
    }
  }
  return { segments, suggestions: [...new Map(suggestions.map((s) => [s.label.toLowerCase(), s])).values()], labels };
}
