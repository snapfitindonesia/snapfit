"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ARTICLES_TAG } from "@/lib/articles";
import { COIN_RULES_TAG } from "@/lib/coins-settings";
import { HOME_TAG } from "@/lib/home/data";
import { SETTINGS_TAG } from "@/lib/overview";
import { ZONES_TAG } from "@/lib/shipping-zone";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { THEME_TAG } from "@/lib/theme-settings";

// SEMUA tag cache data (unstable_cache) — tambahkan di sini bila membuat tag baru.
const ALL_TAGS = [STOREFRONT_TAG, HOME_TAG, ARTICLES_TAG, THEME_TAG, COIN_RULES_TAG, SETTINGS_TAG, ZONES_TAG, "vouchers"];

/**
 * "Segarkan Semua" (Admin): hapus seluruh cache toko — data (tag di atas) + semua halaman ISR
 * (beranda, produk, artikel, promo, dll). Kunjungan berikutnya dirender ulang dari database.
 * Aman: tidak menghapus data apa pun, hanya membuat halaman dibangun ulang (kunjungan pertama
 * setelahnya sedikit lebih lambat).
 */
export async function purgeAllCache(): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  for (const t of ALL_TAGS) revalidateTag(t);
  revalidatePath("/", "layout"); // seluruh halaman di bawah root
  return { ok: true };
}
