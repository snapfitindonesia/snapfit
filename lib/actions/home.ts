"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { sectionsSchema, type HomeSection } from "@/lib/home/sections";
import { HOME_KEY, HOME_TAG } from "@/lib/home/data";

/** Simpan konten beranda (Admin → Konten Beranda). */
export async function saveHomeSections(sections: HomeSection[]): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = sectionsSchema.safeParse(sections);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `Bagian #${Number(i?.path?.[0] ?? 0) + 1}: ${i?.message ?? "data tidak valid"}` };
  }
  if (new Set(parsed.data.map((s) => s.id)).size !== parsed.data.length) return { ok: false, error: "ID bagian ganda." };
  await db.siteSetting.upsert({
    where: { key: HOME_KEY },
    create: { key: HOME_KEY, value: parsed.data },
    update: { value: parsed.data },
  });
  revalidateTag(HOME_TAG);
  revalidatePath("/");
  revalidatePath("/admin/beranda");
  return { ok: true };
}
