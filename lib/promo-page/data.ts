import { getProducts, type ProductListItem } from "@/lib/actions/product";

export { getPromoPageConfig } from "@/lib/promo-page/settings";

/** Produk promo (urutan sesuai dashboard; yang diarsip/stok habis/harga dummy otomatis tak tampil).
 *  includeHidden: produk "hanya di halaman promo" tetap tampil DI SINI. */
export async function getPromoProducts(ids: string[]): Promise<ProductListItem[]> {
  if (!ids.length) return [];
  const { items } = await getProducts({ sort: "terbaru", skip: 0, take: Math.min(48, ids.length) }, { ids, includeHidden: true });
  const order = new Map(ids.map((id, i) => [id, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
