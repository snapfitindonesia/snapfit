// Poin "Overview" di halaman produk. Default berlaku untuk semua produk (Admin → Tampilan
// Toko → Overview Produk); produk bisa punya isian sendiri (form produk → Detail produk).
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { parseOverview } from "@/lib/overview-parse";

export { parseOverview };

export const OVERVIEW_KEY = "pdp.overview";
export const SETTINGS_TAG = "site-settings";

/** Isi bawaan bila admin belum pernah mengatur. */
export const FALLBACK_OVERVIEW = [
  "Garansi resmi & 100% original",
  "Material berkualitas, tahan pakai",
  "7 hari pengembalian bila tidak sesuai",
];

/** Default Overview semua produk (cache bertag; saveDefaultOverview membersihkannya). */
export const getDefaultOverview = unstable_cache(
  async (): Promise<string[]> => {
    const row = await db.siteSetting.findUnique({ where: { key: OVERVIEW_KEY } });
    const v = row?.value;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : FALLBACK_OVERVIEW;
  },
  ["pdp-overview-default"],
  { revalidate: 3600, tags: [SETTINGS_TAG] },
);

/** Overview yang tampil untuk satu produk: isian produk, atau default. */
export async function overviewFor(product: { overview: string | null }): Promise<string[]> {
  const own = parseOverview(product.overview);
  if (own.length) return own;
  return getDefaultOverview().catch(() => FALLBACK_OVERVIEW);
}
