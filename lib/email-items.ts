import { db } from "@/lib/db";
import { emailImage } from "@/lib/email";

/**
 * Lengkapi item pesanan dengan foto (varian → sampul produk) untuk email. Foto CDN sendiri
 * memakai varian 128px (tampil 64px, tajam di layar retina); gagal → item tanpa foto.
 */
export async function withItemImages<T extends { variantId: string }>(items: T[]): Promise<(T & { image: string | null })[]> {
  try {
    const variants = await db.variant.findMany({
      where: { id: { in: items.map((i) => i.variantId) } },
      select: { id: true, image: true, product: { select: { coverImage: true } } },
    });
    const map = new Map(variants.map((v) => [v.id, emailImage(v.image || v.product.coverImage)]));
    return items.map((i) => ({ ...i, image: map.get(i.variantId) ?? null }));
  } catch {
    return items.map((i) => ({ ...i, image: null }));
  }
}
