"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CATALOG_TAG } from "@/lib/catalog";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { PROMO_PAGE_KEY, PROMO_PAGE_PATH, PROMO_PAGE_TAG, parsePromoPage, promoPageSchema, type PromoPageConfig } from "@/lib/promo-page/config";

/** Admin → Halaman Buy 1 Get 1: simpan isi & susunan halaman /buy1get1. */
export async function savePromoPage(input: PromoPageConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = promoPageSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `${i?.path.join(" › ") || "Data"}: ${i?.message ?? "tidak valid"}` };
  }
  // Hanya produk yang benar-benar ada (id palsu/terhapus dibuang).
  const ids = [...new Set(parsed.data.products.productIds)];
  const exist = new Set((await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id));
  const productIds = ids.filter((id) => exist.has(id));
  const value = parsePromoPage({
    ...parsed.data,
    products: { ...parsed.data.products, productIds, hiddenIds: parsed.data.products.hiddenIds.filter((id) => productIds.includes(id)) },
  });
  await db.siteSetting.upsert({
    where: { key: PROMO_PAGE_KEY },
    create: { key: PROMO_PAGE_KEY, value: value as unknown as Prisma.InputJsonValue },
    update: { value: value as unknown as Prisma.InputJsonValue },
  });
  revalidateTag(PROMO_PAGE_TAG);
  revalidatePath(PROMO_PAGE_PATH);
  // Produk "hanya di halaman promo" berubah → daftar produk, beranda, menu & halaman produk ikut segar.
  revalidateTag(CATALOG_TAG);
  revalidateTag(STOREFRONT_TAG);
  revalidatePath("/produk/[slug]", "page");
  return { ok: true };
}
