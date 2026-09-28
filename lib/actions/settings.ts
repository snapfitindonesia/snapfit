"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { OVERVIEW_KEY, SETTINGS_TAG } from "@/lib/overview";
import { parseOverview } from "@/lib/overview-parse";

/** Simpan Overview default semua produk (1 baris = 1 poin). */
export async function saveDefaultOverview(text: string): Promise<{ ok: boolean; error?: string; points?: number }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const points = parseOverview(String(text).slice(0, 4000)).map((p) => p.slice(0, 160));
  if (!points.length) return { ok: false, error: "Isi minimal 1 poin." };
  await db.siteSetting.upsert({
    where: { key: OVERVIEW_KEY },
    create: { key: OVERVIEW_KEY, value: points },
    update: { value: points },
  });
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/produk/[slug]", "page");
  revalidatePath("/admin/overview");
  return { ok: true, points: points.length };
}
