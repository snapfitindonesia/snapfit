import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { normalizeThemeColors, type ThemeColors } from "@/lib/theme-colors";

export const THEME_KEY = "theme.colors";
export const THEME_TAG = "theme-colors";

// Hanya nilai TERSIMPAN yang di-cache (bawaan ada di kode) — segar via revalidateTag saat admin menyimpan.
const getSaved = unstable_cache(
  async () => (await db.siteSetting.findUnique({ where: { key: THEME_KEY } }))?.value ?? null,
  ["theme-colors"],
  { revalidate: 3600, tags: [THEME_TAG] },
);

export async function getThemeColors(): Promise<ThemeColors> {
  try {
    return normalizeThemeColors(await getSaved());
  } catch {
    return normalizeThemeColors(null); // DB tak terjangkau (mis. saat build) → warna bawaan
  }
}
