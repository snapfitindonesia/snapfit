"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { cleanupOrphanImages } from "@/lib/upload/cleanup";

type Result = { ok: boolean; error?: string; id?: string };

function fail(e: unknown): Result {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Data tidak valid." };
  return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan." };
}

function revalidateLinks() {
  revalidatePath("/links");
  revalidatePath("/admin/linktree");
}

const opt = z.string().trim().max(300).optional().or(z.literal(""));

const profileSchema = z.object({
  title: z.string().trim().min(1, "Judul wajib").max(60),
  bio: z.string().trim().max(300).optional().or(z.literal("")),
  avatar: opt,
  instagram: opt,
  tiktok: opt,
  whatsapp: opt,
  shopee: opt,
  tokopedia: opt,
  youtube: opt,
  facebook: opt,
});
export type BioProfileInput = z.infer<typeof profileSchema>;

const linkSchema = z.object({
  title: z.string().trim().min(1, "Judul tombol wajib").max(80),
  url: z
    .string()
    .trim()
    .min(1, "URL wajib")
    .refine((v) => v.startsWith("/") || /^(https?:|mailto:|tel:)/i.test(v), "URL harus diawali https://, / , mailto: atau tel:"),
  image: opt,
  highlight: z.boolean().default(false),
  active: z.boolean().default(true),
});
export type BioLinkInput = z.infer<typeof linkSchema>;

const blank = (v?: string) => (v && v.trim() ? v.trim() : null);

export async function saveBioProfile(input: BioProfileInput): Promise<Result> {
  try {
    await requireAdmin();
    const d = profileSchema.parse(input);
    const before = await db.bioProfile.findUnique({ where: { id: "main" }, select: { avatar: true } });
    const data = {
      title: d.title,
      bio: blank(d.bio),
      avatar: blank(d.avatar),
      instagram: blank(d.instagram),
      tiktok: blank(d.tiktok),
      whatsapp: blank(d.whatsapp),
      shopee: blank(d.shopee),
      tokopedia: blank(d.tokopedia),
      youtube: blank(d.youtube),
      facebook: blank(d.facebook),
    };
    await db.bioProfile.upsert({ where: { id: "main" }, create: { id: "main", ...data }, update: data });
    revalidateLinks();
    if (before?.avatar && before.avatar !== data.avatar) await cleanupOrphanImages([before.avatar]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveBioLink(input: BioLinkInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
    const d = linkSchema.parse(input);
    const data = { title: d.title, url: d.url, image: blank(d.image), highlight: d.highlight, active: d.active };
    if (id) {
      const before = await db.bioLink.findUnique({ where: { id }, select: { image: true } });
      await db.bioLink.update({ where: { id }, data });
      revalidateLinks();
      if (before?.image && before.image !== data.image) await cleanupOrphanImages([before.image]);
      return { ok: true, id };
    }
    const last = await db.bioLink.aggregate({ _max: { order: true } });
    const link = await db.bioLink.create({ data: { ...data, order: (last._max.order ?? -1) + 1 } });
    revalidateLinks();
    return { ok: true, id: link.id };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBioLink(id: string): Promise<Result> {
  try {
    await requireAdmin();
    const link = await db.bioLink.delete({ where: { id } });
    revalidateLinks();
    if (link.image) await cleanupOrphanImages([link.image]);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setBioLinkActive(id: string, active: boolean): Promise<Result> {
  try {
    await requireAdmin();
    await db.bioLink.update({ where: { id }, data: { active } });
    revalidateLinks();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Simpan urutan baru (array id dari atas ke bawah). */
export async function reorderBioLinks(ids: string[]): Promise<Result> {
  try {
    await requireAdmin();
    await db.$transaction(ids.map((id, i) => db.bioLink.update({ where: { id }, data: { order: i } })));
    revalidateLinks();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
