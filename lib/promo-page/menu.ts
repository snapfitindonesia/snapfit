// Menu halaman /buy1get1 dari kategori ASLI (Admin → Kategori): segmen paket (Wanita/Pria/…) = merek perangkat,
// sidebar = seri, isi = model. Semua tautan ke halaman kategori/pencarian yang sudah ada.
import { getMegaMenu } from "@/lib/actions/product";
import type { PromoPageConfig } from "@/lib/promo-page/config";

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
export type PromoMenu = { segments: MenuSegment[]; suggestions: MenuLink[] };

const kat = (slug: string) => `/kategori/${slug}`;
const search = (q: string) => `/produk?q=${encodeURIComponent(q)}`;
const PRODUCT_TYPES = ["Case", "Tempered glass", "Pelindung kamera", "Back glass"];

export async function getPromoMenu(config: PromoPageConfig): Promise<PromoMenu> {
  const brands = await getMegaMenu();
  const segments: MenuSegment[] = brands.map((b) => {
    const series = b.lines.map((l) => ({ label: l.name, href: kat(l.slug) }));
    const types = (scope: string) => PRODUCT_TYPES.map((t) => ({ label: `${t} ${scope}`, href: search(`${t === "Pelindung kamera" ? "lens" : t} ${scope}`) }));
    return {
      id: b.slug,
      label: b.name,
      href: kat(b.slug),
      image: config.categories.images[b.slug] || b.lines.find((l) => l.cover)?.cover || "",
      caption: `Case, tempered glass & pelindung kamera untuk ${b.name}.`,
      categories: [
        {
          name: "Rekomendasi",
          href: kat(b.slug),
          groups: [
            { title: "Seri populer", links: series.slice(0, 8) },
            { title: "Jenis produk", links: types(b.name), isNew: true },
          ],
        },
        ...b.lines.map((l) => ({
          name: l.name,
          href: kat(l.slug),
          groups: [
            { title: "Pilih tipe", links: l.models.length ? l.models.map((m) => ({ label: m.label, href: m.slug ? kat(m.slug) : kat(l.slug) })) : [{ label: `Semua ${l.name}`, href: kat(l.slug) }] },
            { title: "Jenis produk", links: types(l.name) },
          ],
        })),
      ],
      seriesTitle: `Seri ${b.name}`,
      series,
    };
  });
  // Saran pencarian: merek, seri & model (tujuan = halaman kategorinya).
  const suggestions = brands.flatMap((b) => [
    { label: b.name, href: kat(b.slug) },
    ...b.lines.flatMap((l) => [{ label: l.name, href: kat(l.slug) }, ...l.models.filter((m) => m.slug).map((m) => ({ label: m.label, href: kat(m.slug!) }))]),
  ]);
  return { segments, suggestions: [...new Map(suggestions.map((s) => [s.label.toLowerCase(), s])).values()] };
}
