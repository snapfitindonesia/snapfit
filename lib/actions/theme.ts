"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { themeColorsSchema, type ThemeColors } from "@/lib/theme-colors";
import { THEME_KEY, THEME_TAG } from "@/lib/theme-settings";

/** ADMIN: simpan warna situs → semua halaman memakai warna baru. */
export async function saveThemeColors(input: ThemeColors): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = themeColorsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Warna tidak valid." };
  const value = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [k, v.toLowerCase()]));
  await db.siteSetting.upsert({ where: { key: THEME_KEY }, create: { key: THEME_KEY, value }, update: { value } });
  revalidateTag(THEME_TAG);
  revalidatePath("/", "layout"); // semua halaman (layout akar memuat warna)
  return { ok: true };
}
