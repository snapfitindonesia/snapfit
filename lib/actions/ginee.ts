"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isGineeConfigured } from "@/lib/ginee/config";
import {
  searchGineeMasterProducts,
  summarizeGinee,
  getGineeProductDetail,
  getGineeVariationInventory,
  mapGineeFull,
} from "@/lib/ginee/products";
import { runGineeStockSync, type StockSyncResult } from "@/lib/ginee/sync";

type SearchResult =
  | { ok: true; total: number; items: ReturnType<typeof summarizeGinee>[] }
  | { ok: false; error: string };

export async function searchGineeForImport(keyword: string, page = 0): Promise<SearchResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  if (!isGineeConfigured()) return { ok: false, error: "Ginee belum dikonfigurasi (isi GINEE_ACCESS_KEY/SECRET_KEY)." };
  if (!keyword.trim()) return { ok: false, error: "Masukkan kata kunci pencarian." };

  try {
    const { total, content } = await searchGineeMasterProducts(keyword, page, 20);
    return { ok: true, total, items: content.map(summarizeGinee) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengambil data Ginee." };
  }
}

type ImportResult = { ok: boolean; created: number; skipped: number; errors: string[] };

/**
 * Impor PENUH & OTOMATIS dari Ginee: harga per varian, stok, varian, foto,
 * deskripsi — semua ditarik dari Ginee (tanpa isi manual).
 */
export async function importGineeProducts(productIds: string[]): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!isGineeConfigured()) return { ok: false, created: 0, skipped: 0, errors: ["Ginee belum dikonfigurasi."] };
  if (!productIds.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada produk terpilih."] };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const productId of productIds) {
    try {
      const [detail, inv] = await Promise.all([
        getGineeProductDetail(productId),
        getGineeVariationInventory(productId),
      ]);
      if (!detail) {
        skipped++;
        errors.push(`${productId}: detail tak ditemukan.`);
        continue;
      }
      const mapped = mapGineeFull(detail, inv);
      if (!mapped) {
        skipped++;
        errors.push(`"${detail.name.slice(0, 40)}": tanpa varian/foto — dilewati.`);
        continue;
      }

      // Slug unik
      let slug = mapped.slug;
      if (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${slug}-${mapped.gineeProductId.slice(-6).toLowerCase()}`.slice(0, 90);
      }

      // Anti-duplikat: kalau sudah pernah diimpor (by gineeProductId atau SKU) → skip
      const existing = await db.product.findFirst({ where: { gineeProductId: mapped.gineeProductId }, select: { id: true } });
      if (existing) {
        skipped++;
        errors.push(`"${mapped.name.slice(0, 40)}": sudah diimpor — dilewati.`);
        continue;
      }
      const skus = mapped.variants.map((v) => v.sku);
      const clash = await db.variant.findFirst({ where: { sku: { in: skus } }, select: { sku: true } });
      if (clash) {
        skipped++;
        errors.push(`"${mapped.name.slice(0, 40)}": SKU ${clash.sku} sudah ada — dilewati.`);
        continue;
      }

      await db.product.create({
        data: {
          slug,
          name: mapped.name,
          description: mapped.description || null,
          coverImage: mapped.coverImage,
          images: mapped.images,
          variantGroups: mapped.variantGroups,
          gineeProductId: mapped.gineeProductId,
          variants: {
            create: mapped.variants.map((v) => ({
              name: v.name, color: v.color, type: v.type,
              sku: v.sku, price: v.price, stock: v.stock, weight: v.weight, image: v.image,
            })),
          },
        },
      });
      created++;
    } catch (e) {
      skipped++;
      errors.push(`${productId}: ${e instanceof Error ? e.message : "gagal"}.`);
    }
  }

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return { ok: created > 0, created, skipped, errors };
}

/** Sinkron stok Ginee → web untuk semua produk hasil impor (tombol admin). */
export async function syncGineeStock(): Promise<StockSyncResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, productsChecked: 0, variantsUpdated: 0, errors: ["Tidak diizinkan."] };
  }
  const res = await runGineeStockSync();
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return res;
}
