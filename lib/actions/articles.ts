"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ARTICLES_TAG } from "@/lib/articles";
import { slugify } from "@/lib/slug";

const articleInput = z.object({
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160),
  slug: z.string().trim().max(100).default(""),
  excerpt: z.string().trim().max(400).default(""),
  content: z.string().max(60000).default(""),
  coverImage: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\//.test(v), "Foto sampul harus https://")
    .default(""),
  author: z.string().trim().max(60).default("Tim SNAPFIT"),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  published: z.boolean().default(false),
  publishedAt: z.string().default(""), // yyyy-mm-dd (kosong = sekarang)
});
export type ArticleInput = z.input<typeof articleInput>;

type Result = { ok: boolean; error?: string; id?: string; slug?: string };

function refresh(slugs: string[]) {
  revalidateTag(ARTICLES_TAG);
  revalidatePath("/");
  revalidatePath("/artikel");
  for (const s of slugs) revalidatePath(`/artikel/${s}`);
  revalidatePath("/admin/artikel");
}

/** Buat (id kosong) / perbarui artikel. Slug kosong → dari judul; bentrok → akhiran -2, -3, … */
export async function saveArticle(input: ArticleInput, id?: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = articleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const d = parsed.data;

  const base = slugify(d.slug || d.title).slice(0, 90).replace(/-+$/, "") || "artikel";
  let slug = base;
  for (let n = 2; ; n++) {
    const clash = await db.article.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === id) break;
    slug = `${base}-${n}`;
  }

  const prev = id ? await db.article.findUnique({ where: { id }, select: { slug: true, publishedAt: true } }) : null;
  if (id && !prev) return { ok: false, error: "Artikel tidak ditemukan." };
  // Tanggal: isi admin (WIB) → simpan; kosong = pertahankan tanggal lama / sekarang.
  const publishedAt = d.publishedAt
    ? new Date(`${d.publishedAt}T08:00:00+07:00`)
    : (prev?.publishedAt ?? new Date());
  if (Number.isNaN(publishedAt.getTime())) return { ok: false, error: "Tanggal tidak valid." };

  const data = {
    title: d.title,
    slug,
    excerpt: d.excerpt,
    content: d.content,
    coverImage: d.coverImage || null,
    author: d.author || "Tim SNAPFIT",
    tags: [...new Set(d.tags)],
    published: d.published,
    publishedAt,
  };
  const saved = id ? await db.article.update({ where: { id }, data }) : await db.article.create({ data });
  refresh([slug, ...(prev && prev.slug !== slug ? [prev.slug] : [])]);
  return { ok: true, id: saved.id, slug };
}

export async function deleteArticle(id: string): Promise<Result> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const a = await db.article.delete({ where: { id } }).catch(() => null);
  if (!a) return { ok: false, error: "Artikel tidak ditemukan." };
  refresh([a.slug]);
  return { ok: true };
}
