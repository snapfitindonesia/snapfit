"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { BUNDLE_KEY, bundleConfigSchema, getCartBundles, loadBundleItems, type BundleConfig, type BundleItem } from "@/lib/bundles";

/** Publik: bundle untuk drawer keranjang (dimuat saat keranjang dibuka). */
export async function getCartBundlesAction() {
  return getCartBundles();
}

/** ADMIN: simpan pengaturan bundle. */
export async function saveCartBundles(input: BundleConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  const parsed = bundleConfigSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const value = { ...parsed.data, variantIds: [...new Set(parsed.data.variantIds)] };
  await db.siteSetting.upsert({ where: { key: BUNDLE_KEY }, create: { key: BUNDLE_KEY, value }, update: { value } });
  revalidateTag(STOREFRONT_TAG);
  revalidatePath("/admin/bundle");
  return { ok: true };
}

/** ADMIN: cari varian untuk ditambahkan (nama produk / nama varian / SKU, per kata). */
export async function searchBundleVariants(q: string): Promise<BundleItem[]> {
  try {
    await requireAdmin();
  } catch {
    return [];
  }
  const words = q.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (!words.length) return [];
  const variants = await db.variant.findMany({
    where: {
      stock: { gt: 0 },
      product: { archived: false },
      AND: words.map((w) => ({
        OR: [
          { name: { contains: w, mode: "insensitive" as const } },
          { sku: { contains: w, mode: "insensitive" as const } },
          { product: { name: { contains: w, mode: "insensitive" as const } } },
        ],
      })),
    },
    select: { id: true },
    take: 30,
  });
  return loadBundleItems(variants.map((v) => v.id));
}
