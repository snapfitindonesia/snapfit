"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isGineeConfigured } from "@/lib/ginee/config";
import {
  searchGineeMasterProducts,
  summarizeGinee,
  mapGineeToProduct,
  type GineeMasterProduct,
} from "@/lib/ginee/products";

type SearchResult =
  | { ok: true; total: number; items: ReturnType<typeof summarizeGinee>[]; raw: GineeMasterProduct[] }
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
    return { ok: true, total, items: content.map(summarizeGinee), raw: content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengambil data Ginee." };
  }
}

type ImportItem = { product: GineeMasterProduct; price: number };
type ImportResult = { ok: boolean; created: number; skipped: number; errors: string[] };

export async function importGineeProducts(items: ImportItem[]): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!isGineeConfigured()) return { ok: false, created: 0, skipped: 0, errors: ["Ginee belum dikonfigurasi."] };
  if (!items.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada produk terpilih."] };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;

  for (const { product, price } of items) {
    const mapped = mapGineeToProduct(product, price);
    if (!mapped) {
      skipped++;
      errors.push(`"${product.name?.slice(0, 40) ?? "?"}": tanpa varian/foto — dilewati.`);
      continue;
    }
    if (!price || price <= 0) {
      skipped++;
      errors.push(`"${mapped.name.slice(0, 40)}": harga belum diisi — dilewati.`);
      continue;
    }

    try {
      // Slug unik: bila bentrok, tambah potongan productId.
      let slug = mapped.slug;
      if (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${slug}-${mapped.gineeProductId.slice(-6).toLowerCase()}`.slice(0, 90);
      }

      // SKU unik global: bila salah satu SKU sudah ada → anggap sudah diimpor.
      const skus = mapped.variants.map((v) => v.sku);
      const clash = await db.variant.findFirst({ where: { sku: { in: skus } }, select: { sku: true } });
      if (clash) {
        skipped++;
        errors.push(`"${mapped.name.slice(0, 40)}": sudah diimpor (SKU ${clash.sku}) — dilewati.`);
        continue;
      }

      await db.product.create({
        data: {
          slug,
          name: mapped.name,
          coverImage: mapped.coverImage,
          images: mapped.images,
          variantGroups: mapped.variantGroups,
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
      errors.push(`"${mapped.name.slice(0, 40)}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
  }

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  return { ok: created > 0, created, skipped, errors };
}
