import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { getCatalog } from "@/lib/catalog";
import type { PromoItemMeta } from "@/lib/promo-page/filter";

export { getPromoPageConfig } from "@/lib/promo-page/settings";

/** Produk promo (urutan sesuai dashboard; yang diarsip/stok habis/harga dummy otomatis tak tampil).
 *  includeHidden: produk "hanya di halaman promo" tetap tampil DI SINI. */
export async function getPromoProducts(ids: string[]): Promise<ProductListItem[]> {
  if (!ids.length) return [];
  const { items } = await getProducts({ sort: "terbaru", skip: 0, take: Math.min(48, ids.length) }, { ids, includeHidden: true });
  const order = new Map(ids.map((id, i) => [id, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Kategori & teks pencarian produk promo — untuk menu & saringan khusus halaman promo (lib/promo-page/filter.ts). */
export async function getPromoItemMeta(ids: string[]): Promise<PromoItemMeta[]> {
  if (!ids.length) return [];
  const want = new Set(ids);
  return (await getCatalog()).filter((p) => want.has(p.id)).map((p) => ({ id: p.id, slugs: p.deviceSlugs, text: p.haystack }));
}
