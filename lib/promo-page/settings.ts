import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { buildFallback } from "@/lib/build-fallback";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_KEY, PROMO_PAGE_TAG, parsePromoPage, type PromoPageConfig } from "@/lib/promo-page/config";

// Terpisah dari data.ts (yang memakai getProducts) → lib/actions/product.ts bisa membaca produk tersembunyi
// tanpa import melingkar.
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
