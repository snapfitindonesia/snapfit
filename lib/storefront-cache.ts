import { unstable_cache } from "next/cache";
import { buildFallback } from "@/lib/build-fallback";

/**
 * Cache data "rangka" toko (menu header/footer, kategori, facet merek, popup) di Vercel Data Cache:
 * dulu di-query ulang tiap render halaman dinamis → penyumbang terbesar egress Supabase.
 * Segar lagi via revalidateTag(STOREFRONT_TAG) saat admin menyimpan (lib/actions/admin.ts) atau 1 jam.
 * Error DB TIDAK di-cache: saat build → `fallback`; saat ISR/runtime dilempar (lib/build-fallback.ts) agar
 * halaman lama yang benar tetap disajikan, bukan halaman tanpa menu yang ikut ter-cache.
 */
export const STOREFRONT_TAG = "storefront";

export function storefrontCached<A extends unknown[], R>(key: string, fallback: R, fn: (...args: A) => Promise<R>) {
  const cached = unstable_cache(fn, ["storefront", key], { revalidate: 3600, tags: [STOREFRONT_TAG] });
  return async (...args: A): Promise<R> => {
    try {
      return await cached(...args);
    } catch (e) {
      return buildFallback(e, fallback);
    }
  };
}
