"use server";

// Impor produk dari file "Ubah Massal" Shopee (Admin → Impor Shopee). File dibaca di browser
// (lib/shopee/mass-update.ts); di sini hanya produk terpilih: judul, deskripsi, foto & varian PERSIS listing
// Shopee (mis. "[BUY 1 GET 1] …" yang di Ginee menumpang di master produk biasa). SKU sama dengan Ginee →
// stok ikut gudang Ginee (sinkron harian per SKU) & pesanan web tetap masuk Ginee.
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { db } from "@/lib/db";
import { nextShortId } from "@/lib/product-url-server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isGineeConfigured } from "@/lib/ginee/config";
import { gineeRequest } from "@/lib/ginee/client";
import { getWarehouseStockBySku } from "@/lib/ginee/sync";
import { getDefaultWarehouseId } from "@/lib/ginee/orders";
import { guessMerek } from "@/lib/brand-guess";
import { mirrorImages } from "@/lib/upload/mirror";
import { productSlug, skuify } from "@/lib/slug";
import { weightGrams } from "@/lib/shopee/mass-update";
import { MAX_PROMO_PRODUCTS, addToPromoPage, promoPageRoom } from "@/lib/promo-page/add";

const img = z.string().trim().max(1000).regex(/^https:\/\//);
const productSchema = z.object({
  id: z.string().regex(/^\d{6,20}$/),
  name: z.string().trim().min(1).max(255),
  description: z.string().max(10000).default(""),
  parentSku: z.string().max(100).default(""),
  images: z.array(img).max(20),
  weight: z.number().nonnegative().max(100000).optional(),
  variants: z
    .array(
      z.object({
        id: z.string().max(30),
        name: z.string().max(200),
        options: z.array(z.string().max(100)).max(5),
        sku: z.string().max(100),
        price: z.number().int().nonnegative().max(100_000_000),
        stock: z.number().int().nonnegative().max(1_000_000),
        image: img.optional(),
      }),
    )
    .min(1)
    .max(200),
});
export type ShopeeImportProduct = z.infer<typeof productSchema>;

/** Nama produk yang sudah ada di web (huruf besar/kecil diabaikan) — tanda "Sudah diimpor" di daftar. */
export async function findExistingShopeeNames(names: string[]): Promise<string[]> {
  await requireAdmin();
  const want = new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (!want.size) return [];
  // Katalog hanya ribuan produk → bandingkan di JS (satu kueri ringan, bukan ribuan klausa OR).
  const all = await db.product.findMany({ select: { name: true } });
  return all.map((p) => p.name).filter((n) => want.has(n.trim().toLowerCase()));
}

type ImportResult = { ok: boolean; created: number; skipped: number; errors: string[] };

/** Master Ginee pemilik SKU ini (untuk arsip otomatis bila master dihapus di Ginee). */
async function gineeProductIdBySku(skus: string[]): Promise<string | null> {
  for (const sku of skus.slice(0, 3)) {
    const r = await gineeRequest<{ content?: { productId: string }[] }>("POST", "/openapi/product/master/v1/list", { page: 0, size: 1, sku });
    const id = r.data?.content?.[0]?.productId;
    if (id) return id;
  }
  return null;
}

export async function importShopeeProducts(input: unknown[], asPromo = false): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!input.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada produk terpilih."] };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  const merekNames = (await db.merek.findMany({ select: { name: true } })).map((m) => m.name);
  const ginee = isGineeConfigured();
  const warehouseId = ginee ? await getDefaultWarehouseId().catch(() => null) : null;
  const promoCreated: string[] = [];
  let promoRoom = Infinity;
  if (asPromo) {
    try {
      promoRoom = await promoPageRoom();
    } catch (e) {
      return { ok: false, created: 0, skipped: input.length, errors: [`Halaman Buy 1 Get 1: ${e instanceof Error ? e.message : "gagal dibaca"}.`] };
    }
  }

  for (const raw of input.slice(0, 10)) {
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      skipped++;
      errors.push(`Data produk tidak valid (${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}).`);
      continue;
    }
    const p = parsed.data;
    const label = p.name.slice(0, 50);
    try {
      const cover = p.images[0] ?? p.variants.find((v) => v.image)?.image;
      if (!cover) {
        skipped++;
        errors.push(`"${label}": tanpa foto — sertakan file Informasi Media.`);
        continue;
      }
      if (asPromo && promoCreated.length >= promoRoom) {
        skipped++;
        errors.push(`"${label}": halaman Buy 1 Get 1 sudah penuh (maks. ${MAX_PROMO_PRODUCTS} produk) — dilewati.`);
        continue;
      }
      if (await db.product.findFirst({ where: { name: { equals: p.name, mode: "insensitive" } }, select: { id: true } })) {
        skipped++;
        errors.push(`"${label}": sudah ada produk bernama sama — dilewati.`);
        continue;
      }

      // Varian: maks. 2 opsi ("Dark Green,Free Case") → Warna / Tipe, sama dengan konvensi impor Ginee.
      const has2 = p.variants.some((v) => v.options.length >= 2);
      const variants = p.variants.map((v, i) => {
        const color = has2 ? (v.options[0] ?? "") : "";
        const type = has2 ? v.options.slice(1).join(", ") : (v.options[0] ?? "");
        return {
          name: [color, type].filter(Boolean).join(" / ") || "Default",
          color,
          type,
          sku: v.sku || skuify(`${productSlug(p.name)}-${i + 1}`),
          price: v.price,
          stock: v.stock,
          weight: weightGrams(p.weight),
          image: v.image || cover,
        };
      });
      const uniq = (a: string[]) => [...new Set(a.filter(Boolean))];
      const groups = has2
        ? [
            { name: "Warna", options: uniq(variants.map((v) => v.color)).map((value) => ({ value, desc: "" })) },
            { name: "Tipe", options: uniq(variants.map((v) => v.type)).map((value) => ({ value, desc: "" })) },
          ]
        : [{ name: "Tipe", options: uniq(variants.map((v) => v.type)).map((value) => ({ value, desc: "" })) }];

      // Stok: gudang Ginee per SKU (sumber yang sama dgn sinkron harian); SKU tak dikenal → stok Shopee.
      let gineeProductId: string | null = null;
      if (ginee) {
        const skus = uniq(variants.map((v) => v.sku));
        try {
          gineeProductId = await gineeProductIdBySku(skus);
          if (warehouseId) {
            const inv = await getWarehouseStockBySku(skus, warehouseId);
            for (const v of variants) {
              const row = inv.get(v.sku);
              if (row) v.stock = row.stock;
            }
          }
        } catch (e) {
          errors.push(`"${label}": data Ginee gagal dibaca (${e instanceof Error ? e.message : "?"}) — stok dari Shopee dulu, menyusul saat sinkron harian.`);
        }
      }

      let slug = productSlug(p.name);
      if (await db.product.findUnique({ where: { slug }, select: { id: true } })) slug = `${slug}-${p.id.slice(-6)}`.slice(0, 90);

      const mirror = await mirrorImages([...p.images, ...variants.map((v) => v.image)]);
      const cdn = (u: string) => mirror.get(u) ?? u;

      const product = await db.product.create({
        select: { id: true },
        data: {
          slug,
          shortId: await nextShortId(),
          name: p.name,
          brand: guessMerek(p.name, merekNames),
          description: p.description || null,
          coverImage: cdn(cover),
          images: (p.images.length ? p.images : [cover]).map(cdn),
          variantGroups: { groups },
          gineeProductId,
          variants: { create: variants.map((v) => ({ ...v, image: cdn(v.image) })) },
        },
      });
      created++;
      if (asPromo) promoCreated.push(product.id);
    } catch (e) {
      skipped++;
      errors.push(`"${label}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
  }

  if (promoCreated.length) {
    try {
      await addToPromoPage(promoCreated);
    } catch (e) {
      errors.push(`Produk dibuat, tapi gagal dimasukkan ke halaman Buy 1 Get 1 (${e instanceof Error ? e.message : "?"}) — tambahkan manual di Admin → Halaman Buy 1 Get 1.`);
    }
  }
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidateTag(STOREFRONT_TAG);
  return { ok: created > 0, created, skipped, errors };
}
