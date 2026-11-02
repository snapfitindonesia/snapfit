// Ambil & petakan Master Produk Ginee → bentuk siap-impor ke schema web.
import { isPlaceholderPrice } from "@/lib/price-guard";
import { productSlug, skuify } from "@/lib/slug";
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

// --- Detail produk (utk impor penuh: harga per varian, deskripsi, foto) ---

export type GineeProductDetail = {
  productId: string;
  name: string;
  images?: string[];
  shortDescription?: string;
  fullCategoryName?: string[];
  masterVariationType?: string;
};

/** Detail 1 master produk: nama, foto, deskripsi, kategori. */
export async function getGineeProductDetail(productId: string): Promise<GineeProductDetail | null> {
  const res = await gineeRequest<GineeProductDetail>(
    "GET",
    "/openapi/product/master/v1/get",
    { productId },
  );
  return res.data ?? null;
}

// variationBriefs dari search SUDAH terfilter benar per produk (endpoint inventory
// & price briefs MENGABAIKAN filter produk — jangan dipakai untuk per-produk).
export type GineeVariationBrief = {
  id: string; // masterVariationId
  sku: string;
  optionValues?: string[];
  stock?: number; // availableStock
};

// Toko acuan harga web: harga JUAL (setelah diskon) toko ini di Shopee. Akun Ginee
// terhubung ke beberapa toko (Primary…, Toko Cares…), jadi harus dipilih yang benar.
const PRICE_SHOP = (process.env.GINEE_PRICE_SHOP_NAME || "Snapfit Indonesia").toLowerCase();
const PRICE_CHANNEL = process.env.GINEE_PRICE_CHANNEL || "SHOPEE_ID";

type ChannelPrice = {
  shopId?: string;
  shopName?: string;
  channel?: string;
  channelPrice?: { amount?: number };
  channelSellingPrice?: { amount?: number };
};

export type GineeShop = { shopId: string; name: string; channel: string };

/** Toko kanal yang masih TERHUBUNG di akun Ginee (Shopee, TikTok, Blibli, manual…). */
export async function listGineeShops(): Promise<GineeShop[]> {
  type Row = { shopId?: string; name?: string; channel?: string; authorizationStatus?: string };
  const out: GineeShop[] = [];
  for (let page = 0; page < 10; page++) {
    const res = await gineeRequest<Row[] | { content?: Row[] }>("POST", "/openapi/shop/v1/list", { page, size: 100 });
    const rows = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
    for (const r of rows) {
      if (r.shopId && r.authorizationStatus === "CONNECTED") out.push({ shopId: r.shopId, name: r.name ?? r.shopId, channel: r.channel ?? "" });
    }
    if (rows.length < 100) break;
  }
  return out;
}

export type VariationPrice = {
  price: number;
  image?: string;
  source: "shop" | "master" | "none";
  /** Varian ini dijual (terhubung) di toko yang diminta / toko acuan. */
  listed: boolean;
};

/**
 * Harga (+ foto) per varian — TERFILTER benar via masterVariationIds.
 * `price` = harga jual toko `shopId` bila diberikan, selain itu toko acuan (Shopee
 * "Snapfit Indonesia"); bila tak ada, harga master Ginee asalkan wajar (< Rp900rb);
 * selain itu 0 (= jangan dipakai).
 */
export async function getGineeVariationPrices(
  variationIds: string[],
  shopId?: string,
): Promise<Map<string, VariationPrice>> {
  const map = new Map<string, VariationPrice>();
  type Row = { variationId: string; masterPrice?: { amount?: number }; image?: string; channelPriceVOList?: ChannelPrice[] };
  const amount = (c?: ChannelPrice) => Math.round(c?.channelSellingPrice?.amount ?? c?.channelPrice?.amount ?? 0);
  for (let i = 0; i < variationIds.length; i += 200) {
    const ids = variationIds.slice(i, i + 200);
    const res = await gineeRequest<{ content?: Row[] }>(
      "POST",
      "/openapi/product/variation/v1/list-price",
      { page: 0, size: ids.length, masterVariationIds: ids },
    );
    for (const r of res.data?.content ?? []) {
      // 1 varian bisa punya >1 listing di toko yang sama → utamakan yang harganya wajar.
      const hits = (r.channelPriceVOList ?? []).filter((c) =>
        shopId ? c.shopId === shopId : c.channel === PRICE_CHANNEL && (c.shopName ?? "").toLowerCase() === PRICE_SHOP,
      );
      const shopPrice = amount(hits.find((c) => !isPlaceholderPrice(amount(c))) ?? hits[0]);
      const master = Math.round(r.masterPrice?.amount ?? 0);
      const entry =
        !isPlaceholderPrice(shopPrice)
          ? { price: shopPrice, source: "shop" as const }
          : !isPlaceholderPrice(master)
            ? { price: master, source: "master" as const }
            : { price: 0, source: "none" as const };
      map.set(r.variationId, { ...entry, image: r.image, listed: hits.length > 0 });
    }
  }
  return map;
}

/**
 * Impor: dari variationBriefs (search, terfilter per produk) + detail
 * (foto/deskripsi) + peta harga per varian → data siap create.
 */
export function mapGineeFromBriefs(
  productId: string,
  detail: GineeProductDetail | null,
  briefs: GineeVariationBrief[],
  priceMap: Map<string, { price: number; image?: string }>,
  fallbackName: string,
): MappedProduct | null {
  if (!briefs.length) return null;
  const name = detail?.name || fallbackName;
  const cover = detail?.images?.[0] ?? [...priceMap.values()].find((p) => p.image)?.image ?? "";
  if (!cover) return null;

  const has2 = briefs.some((v) => (v.optionValues?.length ?? 0) >= 2);
  const seenSku = new Set<string>();
  const variants: MappedVariant[] = briefs.map((v, i) => {
    const opts = v.optionValues ?? [];
    const color = has2 ? (opts[0] ?? "") : "";
    const type = has2 ? (opts[1] ?? "") : (opts[0] ?? "");
    let sku = skuify(v.sku || `${productSlug(name)}-${i + 1}`);
    while (seenSku.has(sku)) sku = `${sku}-${i + 1}`;
    seenSku.add(sku);
    const pr = priceMap.get(v.id);
    return {
      name: [color, type].filter(Boolean).join(" / ") || type || "Default",
      color, type, sku,
      price: pr?.price ?? 0,
      stock: Math.max(0, v.stock ?? 0),
      weight: 200,
      image: pr?.image || cover,
    };
  });

  const groups: MappedProduct["variantGroups"]["groups"] = [];
  if (has2) {
    groups.push({ name: "Warna", options: uniq(briefs.map((v) => v.optionValues?.[0] ?? "")).map((value) => ({ value, desc: "" })) });
    groups.push({ name: "Tipe", options: uniq(briefs.map((v) => v.optionValues?.[1] ?? "")).map((value) => ({ value, desc: "" })) });
  } else {
    groups.push({ name: "Tipe", options: uniq(briefs.map((v) => v.optionValues?.[0] ?? "")).map((value) => ({ value, desc: "" })) });
  }

  return {
    gineeProductId: productId,
    slug: productSlug(name),
    name,
    coverImage: cover,
    images: (detail?.images ?? []).filter(Boolean).length ? detail!.images!.filter(Boolean) : [cover],
    description: detail?.shortDescription ?? "",
    variantGroups: { groups },
    variants,
  };
}

// --- Pemetaan ke bentuk Product/Variant web (samakan konvensi bulkImport) ---

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
  description?: string;
  variantGroups: { groups: { name: string; options: { value: string; desc: string }[] }[] };
  variants: MappedVariant[];
};

/** Ringkasan untuk preview di UI (tanpa menulis apa pun). */
// Stok TIDAK diambil dari sini (stok master Ginee selalu 0) — pakai inventori gudang.
export function summarizeGinee(mp: GineeMasterProduct) {
  const vars = mp.variationBriefs ?? [];
  return {
    productId: mp.productId,
    name: mp.name,
    image: mp.images?.[0] ?? "",
    variantCount: vars.length,
  };
}
