// Ambil & petakan Master Produk Ginee → bentuk siap-impor ke schema web.
import { gineeRequest } from "./client";

export type GineeVariation = {
  id: string;
  sku: string;
  optionValues?: string[];
  stock?: { availableStock?: number; warehouseStock?: number };
};

export type GineeMasterProduct = {
  productId: string;
  name: string;
  fullCategoryName?: string[];
  images?: string[];
  masterVariationType?: string;
  variationBriefs?: GineeVariation[];
};

export type GineeListResult = { total: number; content: GineeMasterProduct[] };

/** Cari master produk by nama (productName). page mulai 0, size < 200. */
export async function searchGineeMasterProducts(
  productName: string,
  page = 0,
  size = 20,
): Promise<GineeListResult> {
  const res = await gineeRequest<GineeListResult>(
    "POST",
    "/openapi/product/master/v1/list",
    { page, size, ...(productName.trim() ? { productName: productName.trim() } : {}) },
  );
  return res.data ?? { total: 0, content: [] };
}

/** Ambil 1 master produk lewat salah satu SKU-nya (utk baca stok terkini). */
export async function getGineeProductBySku(sku: string): Promise<GineeMasterProduct | null> {
  const res = await gineeRequest<GineeListResult>(
    "POST",
    "/openapi/product/master/v1/list",
    { page: 0, size: 5, sku },
  );
  const list = res.data?.content ?? [];
  // Cocokkan produk yang benar-benar memuat SKU tsb.
  return list.find((p) => (p.variationBriefs ?? []).some((v) => v.sku === sku)) ?? list[0] ?? null;
}

/** Peta SKU → availableStock dari sebuah master produk. */
export function stockMapFromProduct(mp: GineeMasterProduct): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of mp.variationBriefs ?? []) {
    if (v.sku) m.set(v.sku, Math.max(0, v.stock?.availableStock ?? 0));
  }
  return m;
}

// --- Pemetaan ke bentuk Product/Variant web (samakan konvensi bulkImport) ---

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-|-$/g, "");
const skuify = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))];

export type MappedVariant = {
  name: string; color: string; type: string;
  sku: string; price: number; stock: number; weight: number; image: string;
};
export type MappedProduct = {
  gineeProductId: string;
  slug: string;
  name: string;
  coverImage: string;
  images: string[];
  variantGroups: { groups: { name: string; options: { value: string; desc: string }[] }[] };
  variants: MappedVariant[];
};

/** Ringkasan untuk preview di UI (tanpa menulis apa pun). */
export function summarizeGinee(mp: GineeMasterProduct) {
  const vars = mp.variationBriefs ?? [];
  const stock = vars.reduce((n, v) => n + (v.stock?.availableStock ?? 0), 0);
  return {
    productId: mp.productId,
    name: mp.name,
    image: mp.images?.[0] ?? "",
    variantCount: vars.length,
    stock,
  };
}

/**
 * Petakan 1 master produk + harga (rupiah) → data siap create.
 * Ginee tak menyimpan harga → harga diisi admin (dipakai utk semua varian).
 */
export function mapGineeToProduct(mp: GineeMasterProduct, price: number): MappedProduct | null {
  const vars = mp.variationBriefs ?? [];
  if (!vars.length) return null;
  const cover = mp.images?.[0] ?? "";
  if (!cover) return null;

  const has2 = vars.some((v) => (v.optionValues?.length ?? 0) >= 2);
  const p = Math.max(0, Math.round(price || 0));

  const seenSku = new Set<string>();
  const variants: MappedVariant[] = vars.map((v, i) => {
    const opts = v.optionValues ?? [];
    const color = has2 ? (opts[0] ?? "") : "";
    const type = has2 ? (opts[1] ?? "") : (opts[0] ?? "");
    let sku = skuify(v.sku || `${slugify(mp.name)}-${i + 1}`);
    while (seenSku.has(sku)) sku = `${sku}-${i + 1}`;
    seenSku.add(sku);
    return {
      name: [color, type].filter(Boolean).join(" / ") || type || "Default",
      color,
      type,
      sku,
      price: p,
      stock: Math.max(0, v.stock?.availableStock ?? 0),
      weight: 200,
      image: cover, // brief tak punya foto per-varian → pakai cover
    };
  });

  const groups: MappedProduct["variantGroups"]["groups"] = [];
  if (has2) {
    groups.push({ name: "Warna", options: uniq(vars.map((v) => v.optionValues?.[0] ?? "")).map((value) => ({ value, desc: "" })) });
    groups.push({ name: "Tipe", options: uniq(vars.map((v) => v.optionValues?.[1] ?? "")).map((value) => ({ value, desc: "" })) });
  } else {
    groups.push({ name: "Tipe", options: uniq(vars.map((v) => v.optionValues?.[0] ?? "")).map((value) => ({ value, desc: "" })) });
  }

  return {
    gineeProductId: mp.productId,
    slug: slugify(mp.name),
    name: mp.name,
    coverImage: cover,
    images: (mp.images ?? []).filter(Boolean),
    variantGroups: { groups },
    variants,
  };
}
