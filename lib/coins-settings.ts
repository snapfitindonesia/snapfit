import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { normalizeCoinRules, type CoinRules } from "@/lib/coins-rules";

export const COIN_RULES_KEY = "coins.rules";
export const COIN_RULES_TAG = "coin-rules";

// Hanya nilai TERSIMPAN yang di-cache (bukan default) — Data Cache Vercel bertahan lintas deploy,
// jadi default yang di-cache tak ikut berubah bila DEFAULT_COIN_RULES diubah di kode.
const getSaved = unstable_cache(
  async () => (await db.siteSetting.findUnique({ where: { key: COIN_RULES_KEY } }))?.value ?? null,
  ["coin-rules"],
  { revalidate: 3600, tags: [COIN_RULES_TAG] },
);

/** Aturan koin aktif (Admin → Koin Member), digabung dengan default. */
export async function getCoinRules(): Promise<CoinRules> {
  try {
    return normalizeCoinRules(await getSaved());
  } catch {
    return normalizeCoinRules(null);
  }
}
