import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { getProducts, type ProductListItem } from "@/lib/actions/product";
import { buildFallback } from "@/lib/build-fallback";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_KEY, PROMO_PAGE_TAG, parsePromoPage, type PromoPageConfig } from "@/lib/promo-page/config";

const cachedRaw = unstable_cache(
  async (): Promise<unknown> => (await db.siteSetting.findUnique({ where: { key: PROMO_PAGE_KEY } }))?.value ?? null,
  ["promo-page", PROMO_PAGE_KEY],
  { revalidate: 3600, tags: [PROMO_PAGE_TAG] },
);

/** Pengaturan halaman /buy1get1 (Admin → Halaman Buy 1 Get 1); belum pernah disimpan → bawaan. */
export async function getPromoPageConfig(): Promise<PromoPageConfig> {
  try {
    return parsePromoPage((await cachedRaw()) ?? DEFAULT_PROMO_PAGE);
  } catch (e) {
    return buildFallback(e, DEFAULT_PROMO_PAGE);
  }
}

/** Produk promo (urutan sesuai dashboard; yang diarsip/stok habis/harga dummy otomatis tak tampil). */
export async function getPromoProducts(ids: string[]): Promise<ProductListItem[]> {
  if (!ids.length) return [];
  const { items } = await getProducts({ sort: "terbaru", skip: 0, take: Math.min(48, ids.length) }, { ids });
  const order = new Map(ids.map((id, i) => [id, i]));
  return items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
