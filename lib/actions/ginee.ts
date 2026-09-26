"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isGineeConfigured } from "@/lib/ginee/config";
import {
  searchGineeMasterProducts,
  summarizeGinee,
  getGineeProductDetail,
  getGineeVariationPrices,
  mapGineeFromBriefs,
  type GineeVariationBrief,
} from "@/lib/ginee/products";
import { runGineeStockSync, getWarehouseStockBySku, type StockSyncResult } from "@/lib/ginee/sync";
import { getDefaultWarehouseId } from "@/lib/ginee/orders";
import { guessMerek } from "@/lib/brand-guess";
import { mirrorImages } from "@/lib/upload/mirror";

type SearchItem = ReturnType<typeof summarizeGinee> & {
  imported: boolean;
  variations: GineeVariationBrief[];
};
type SearchResult = { ok: true; total: number; items: SearchItem[] } | { ok: false; error: string };

export async function searchGineeForImport(keyword: string, page = 0): Promise<SearchResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  if (!isGineeConfigured()) return { ok: false, error: "Ginee belum dikonfigurasi (isi GINEE_ACCESS_KEY/SECRET_KEY)." };
  if (!keyword.trim()) return { ok: false, error: "Masukkan kata kunci pencarian." };

  try {
    const { total, content } = await searchGineeMasterProducts(keyword, page, 100);
    const existing = await db.product.findMany({
      where: { gineeProductId: { in: content.map((c) => c.productId) } },
      select: { gineeProductId: true },
    });
    const importedSet = new Set(existing.map((e) => e.gineeProductId));
    const items: SearchItem[] = content.map((c) => ({
      ...summarizeGinee(c),
      imported: importedSet.has(c.productId),
      // variationBriefs dari search = sumber varian yang benar (terfilter per produk)
      variations: (c.variationBriefs ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        optionValues: v.optionValues ?? [],
        stock: v.stock?.availableStock ?? 0,
      })),
    }));
    return { ok: true, total, items };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengambil data Ginee." };
  }
}

type ImportInput = { productId: string; name: string; variations: GineeVariationBrief[] };
type ImportResult = { ok: boolean; created: number; skipped: number; errors: string[] };

/**
 * Impor PENUH & "LANGSUNG SIAP JUAL" dari Ginee:
 *  - varian (variationBriefs search), foto & deskripsi (product detail)
 *  - harga = harga jual toko Shopee Snapfit Indonesia (placeholder → tersembunyi)
 *  - stok  = inventori GUDANG Ginee (bukan stok master yang selalu 0)
 *  - merek = ditebak dari judul (hanya merek terdaftar)
 *  - foto  = disalin ke cdn.snapfit.id (WebP), bukan hotlink marketplace
 * UI memanggil per 3 produk agar tak kena batas waktu.
 */
export async function importGineeProducts(inputs: ImportInput[]): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!isGineeConfigured()) return { ok: false, created: 0, skipped: 0, errors: ["Ginee belum dikonfigurasi."] };
  if (!inputs.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada produk terpilih."] };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  const merekNames = (await db.merek.findMany({ select: { name: true } })).map((m) => m.name);
  const warehouseId = await getDefaultWarehouseId().catch(() => null);

  for (const input of inputs) {
    const label = input.name?.slice(0, 40) ?? input.productId;
    try {
      if (!input.variations?.length) {
        skipped++;
        errors.push(`"${label}": tanpa varian — dilewati.`);
        continue;
      }

      const priceMap = await getGineeVariationPrices(input.variations.map((v) => v.id));
      // Deskripsi & galeri opsional — jangan gagalkan produk kalau `get` kena limit.
      let detail = null;
      try {
        detail = await getGineeProductDetail(input.productId);
      } catch {
        /* lanjut tanpa deskripsi/galeri */
      }

      const mapped = mapGineeFromBriefs(input.productId, detail, input.variations, priceMap, input.name);
      if (!mapped) {
        skipped++;
        errors.push(`"${label}": tanpa foto — dilewati.`);
        continue;
      }

      // Sudah pernah diimpor (by gineeProductId)?
      if (await db.product.findFirst({ where: { gineeProductId: input.productId }, select: { id: true } })) {
        skipped++;
        errors.push(`"${label}": sudah diimpor — dilewati.`);
        continue;
      }
      // Slug unik
      let slug = mapped.slug;
      if (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${slug}-${input.productId.slice(-6).toLowerCase()}`.slice(0, 90);
      }
      // SKU unik global
      const clash = await db.variant.findFirst({ where: { sku: { in: mapped.variants.map((v) => v.sku) } }, select: { sku: true } });
      if (clash) {
        skipped++;
        errors.push(`"${label}": SKU ${clash.sku} sudah ada — dilewati.`);
        continue;
      }

      // Stok dari gudang Ginee (stok master selalu 0).
      if (warehouseId) {
        try {
          const inv = await getWarehouseStockBySku(mapped.variants.map((v) => v.sku), warehouseId);
          for (const v of mapped.variants) {
            const row = inv.get(v.sku);
            if (row) v.stock = row.stock;
          }
        } catch (e) {
          errors.push(`"${label}": stok gudang gagal dibaca (${e instanceof Error ? e.message : "?"}) — stok 0, akan terisi saat sinkron harian.`);
        }
      }
      // Foto → CDN sendiri (gagal = tetap pakai URL asli).
      const mirror = await mirrorImages([mapped.coverImage, ...mapped.images, ...mapped.variants.map((v) => v.image)]);
      const cdn = (u: string) => mirror.get(u) ?? u;

      await db.product.create({
        data: {
          slug,
          name: mapped.name,
          brand: guessMerek(mapped.name, merekNames),
          description: mapped.description || null,
          coverImage: cdn(mapped.coverImage),
          images: mapped.images.map(cdn),
          variantGroups: mapped.variantGroups,
          gineeProductId: mapped.gineeProductId,
          variants: {
            create: mapped.variants.map((v) => ({
              name: v.name, color: v.color, type: v.type,
              sku: v.sku, price: v.price, stock: v.stock, weight: v.weight, image: cdn(v.image),
            })),
          },
        },
      });
      created++;
    } catch (e) {
      skipped++;
      errors.push(`"${label}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
    // Jeda kecil antar-produk untuk hormati rate limit Ginee.
    await new Promise((r) => setTimeout(r, 200));
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
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: ["Tidak diizinkan."] };
  }
  const res = await runGineeStockSync();
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return res;
}
