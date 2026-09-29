import { unstable_cache } from "next/cache";

/**
 * Cache data "rangka" toko (menu header/footer, kategori, facet merek, popup) di Vercel Data Cache:
 * dulu di-query ulang tiap render halaman dinamis → penyumbang terbesar egress Supabase.
 * Segar lagi via revalidateTag(STOREFRONT_TAG) saat admin menyimpan (lib/actions/admin.ts) atau 1 jam.
 * Error DB TIDAK di-cache: dilempar dari dalam cache, ditangkap di luar → `fallback`.
 */
export const STOREFRONT_TAG = "storefront";

export function storefrontCached<A extends unknown[], R>(key: string, fallback: R, fn: (...args: A) => Promise<R>) {
  const cached = unstable_cache(fn, ["storefront", key], { revalidate: 3600, tags: [STOREFRONT_TAG] });
  return async (...args: A): Promise<R> => {
    try {
      return await cached(...args);
    } catch {
      return fallback; // DB tak terjangkau (mis. saat build) → halaman tetap render
    }
  };
}
