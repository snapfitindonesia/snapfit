import { db } from "@/lib/db";
import { r2Config, cdnConfig, deleteFromR2, deleteFromCdn } from "@/lib/upload/cdn";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SUPABASE_BUCKET = "product-images";

function noSlash(s: string) {
  return s.replace(/\/$/, "");
}

function filenameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").pop() || "") || null;
  } catch {
    return null;
  }
}

/** True bila URL adalah file di storage KITA (R2 / CDN / Supabase bucket), bukan URL eksternal. */
export function isOurImage(url: string): boolean {
  if (!url) return false;
  const r2 = process.env.R2_PUBLIC_URL;
  const cdn = process.env.CDN_BASE_URL;
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (r2 && url.startsWith(noSlash(r2))) return true;
  if (cdn && url.startsWith(noSlash(cdn))) return true;
  if (supa && url.startsWith(noSlash(supa)) && url.includes(`/${SUPABASE_BUCKET}/`)) return true;
  return false;
}

/** Hapus 1 file gambar dari storage kita (best-effort, diam bila gagal). */
async function deleteStoredImage(url: string): Promise<void> {
  if (!isOurImage(url)) return;
  const filename = filenameFromUrl(url);
  if (!filename) return;

  const r2 = process.env.R2_PUBLIC_URL;
  const cdn = process.env.CDN_BASE_URL;
  const supa = process.env.NEXT_PUBLIC_SUPABASE_URL;

  // Supabase Storage
  if (supa && url.startsWith(noSlash(supa))) {
    try {
      const supabase = createSupabaseAdminClient();
      if (supabase) await supabase.storage.from(SUPABASE_BUCKET).remove([filename]);
    } catch (e) {
      console.error("Hapus Supabase gagal (diabaikan):", e instanceof Error ? e.message : e);
    }
    return;
  }

  // R2 dan/atau CDN cPanel bisa berbagi domain yang sama (cdn.snapfit.id) — coba
  // keduanya bila dikonfigurasi & prefix cocok, best-effort.
  const matchR2 = r2 && url.startsWith(noSlash(r2));
  const matchCdn = cdn && url.startsWith(noSlash(cdn));
  if (matchR2 && r2Config()) {
    try { await deleteFromR2(filename); } catch (e) { console.error("Hapus R2 gagal:", e instanceof Error ? e.message : e); }
  }
  if (matchCdn && cdnConfig()) {
    try { await deleteFromCdn(filename); } catch (e) { console.error("Hapus CDN gagal:", e instanceof Error ? e.message : e); }
  }
}

/** True bila URL masih dipakai di produk/varian/banner/kategori/ulasan/linktree mana pun. */
async function isImageReferenced(url: string): Promise<boolean> {
  const [cover, gallery, variant, banner, category, review, bioLink, bioProfile] = await Promise.all([
    db.product.findFirst({ where: { coverImage: url }, select: { id: true } }),
    db.product.findFirst({ where: { images: { array_contains: url } }, select: { id: true } }),
    db.variant.findFirst({ where: { image: url }, select: { id: true } }),
    db.banner.findFirst({ where: { image: url }, select: { id: true } }),
    db.category.findFirst({ where: { image: url }, select: { id: true } }),
    db.review.findFirst({ where: { image: url }, select: { id: true } }),
    db.bioLink.findFirst({ where: { image: url }, select: { id: true } }),
    db.bioProfile.findFirst({ where: { OR: [{ avatar: url }, { bgImage: url }] }, select: { id: true } }),
  ]);
  return !!(cover || gallery || variant || banner || category || review || bioLink || bioProfile);
}

/**
 * Hapus file gambar yang SUDAH TIDAK dipakai lagi. Panggil SESUDAH mutasi DB
 * (delete/update). Aman: hanya file milik kita & yang tak direferensikan mana pun.
 */
export async function cleanupOrphanImages(urls: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  for (const url of unique) {
    try {
      if (!isOurImage(url)) continue;
      if (await isImageReferenced(url)) continue;
      await deleteStoredImage(url);
    } catch (e) {
      console.error("cleanupOrphanImages gagal untuk", url, e instanceof Error ? e.message : e);
    }
  }
}
