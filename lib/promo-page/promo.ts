// Produk "hanya di halaman promo" (Admin → Halaman Buy 1 Get 1 → Produk promo) — server.
import { getPromoPageConfig } from "@/lib/promo-page/settings";

/** Produk "hanya di halaman promo" — disembunyikan dari seluruh website kecuali /buy1get1. */
export async function getPromoHiddenIds(): Promise<Set<string>> {
  const c = await getPromoPageConfig();
  const listed = new Set(c.products.productIds);
  return new Set(c.products.hiddenIds.filter((id) => listed.has(id)));
}
