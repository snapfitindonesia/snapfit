"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CATALOG_TAG } from "@/lib/catalog";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { mirrorImages } from "@/lib/upload/mirror";
import { cleanupOrphanImages } from "@/lib/upload/cleanup";
import { optionOf, planMediaChanges, type MediaProduct, type MediaRow } from "@/lib/bulk-media";

export type BulkMediaResult = {
  ok: boolean;
  productsUpdated: number;
  variantsUpdated: number;
  imported: number;
  skipped: number;
  errors: string[];
};

const MAX_ROWS = 5000;

/** Foto sudah di CDN/penyimpanan kita (tak perlu disalin). */
function isOwn(url: string): boolean {
  const pub = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return (pub !== "" && url.startsWith(pub)) || url.startsWith("https://cdn.snapfit.id/") || url.includes("r2.dev") || url.includes("supabase.co");
}

/**
 * Edit Massal → Media: terapkan file CSV media (lihat lib/bulk-media.ts). Foto dari alamat luar
 * (Shopee/TikTok/web lain) disalin dulu ke CDN SNAPFIT; yang gagal disalin → barisnya dilewati.
 * Foto lama yang tak terpakai lagi dihapus dari penyimpanan.
 */
export async function bulkUpdateMedia(rows: MediaRow[], headers: string[]): Promise<BulkMediaResult> {
  const res: BulkMediaResult = { ok: false, productsUpdated: 0, variantsUpdated: 0, imported: 0, skipped: 0, errors: [] };
  try {
    await requireAdmin();
  } catch {
    return { ...res, errors: ["Tidak diizinkan."] };
  }
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) return { ...res, errors: [`Maks. ${MAX_ROWS} baris per file.`] };

  const ids = [...new Set(rows.map((r) => String(r.productId ?? "").trim()).filter(Boolean))];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, coverImage: true, images: true, variants: { select: { id: true, color: true, type: true, name: true, image: true } } },
  });
  const current = new Map<string, MediaProduct & { variantIds: { id: string; v: MediaProduct["variants"][number] }[] }>();
  for (const p of products) {
    const images = Array.isArray(p.images) ? (p.images as string[]) : [];
    const variants = p.variants.map((v) => ({ color: v.color, type: v.type, name: v.name, image: v.image }));
    current.set(p.id, { id: p.id, name: p.name, coverImage: p.coverImage, images, variants, variantIds: p.variants.map((v, i) => ({ id: v.id, v: variants[i]! })) });
  }

  const plan = planMediaChanges(rows, current, headers);
  res.errors.push(...plan.errors);
  res.skipped = plan.skipped;

  // Salin foto dari alamat luar ke CDN (paralel terbatas). Gagal → perubahan yang memakainya dibatalkan.
  const external = [
    ...plan.products.flatMap((u) => [u.coverImage, ...u.images]),
    ...plan.variants.map((u) => u.image),
  ].filter((u) => !isOwn(u));
  const mirrored = external.length ? await mirrorImages(external, 4) : new Map<string, string>();
  res.imported = mirrored.size;
  const resolve = (u: string) => (isOwn(u) ? u : mirrored.get(u) ?? null);

  const oldImages: (string | null)[] = [];
  for (const u of plan.products) {
    const cover = resolve(u.coverImage);
    const images = u.images.map(resolve);
    const cur = current.get(u.productId)!;
    if (!cover || images.some((x) => !x)) {
      res.skipped++;
      res.errors.push(`${cur.name.slice(0, 50)}: ada foto yang gagal diunduh — foto produk tidak diubah.`);
      continue;
    }
    await db.product.update({ where: { id: u.productId }, data: { coverImage: cover, images: images as string[] } });
    oldImages.push(cur.coverImage, ...cur.images);
    res.productsUpdated++;
  }
  for (const u of plan.variants) {
    const cur = current.get(u.productId)!;
    const image = resolve(u.image);
    if (!image) {
      res.skipped++;
      res.errors.push(`${cur.name.slice(0, 40)} · ${u.option}: foto variasi gagal diunduh — tidak diubah.`);
      continue;
    }
    const hc = cur.variants.some((v) => v.color.trim() !== "");
    const targets = cur.variantIds.filter((x) => optionOf(x.v, hc) === u.option);
    const r = await db.variant.updateMany({ where: { id: { in: targets.map((t) => t.id) } }, data: { image } });
    oldImages.push(...targets.map((t) => t.v.image));
    res.variantsUpdated += r.count;
  }

  if (res.productsUpdated || res.variantsUpdated) {
    // Hanya foto yang tak dipakai produk/varian/banner lain yang dihapus dari penyimpanan.
    await cleanupOrphanImages(oldImages).catch((e) => console.error("Bersihkan foto lama gagal:", e));
    revalidateTag(CATALOG_TAG);
    revalidateTag(STOREFRONT_TAG);
    revalidatePath("/admin/produk");
    revalidatePath("/produk/[slug]", "page");
  }
  res.ok = true;
  return res;
}
