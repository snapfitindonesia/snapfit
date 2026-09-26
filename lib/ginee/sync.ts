// Sinkron STOK + HARGA Ginee → web (pull). Dipakai server action (tombol admin) & cron.
//
// STOK diambil dari INVENTORI GUDANG (warehouse-inventory/sku/list, availableStock) —
// BUKAN dari produk master: stok di master (variationBriefs.stock) selalu 0 karena
// stok Ginee tercatat per gudang. Dicari per 50 SKU sekaligus (±18 panggilan / 900 SKU).
// HARGA: harga JUAL toko Shopee "Snapfit Indonesia" (channelPriceVOList di list-price),
// BUKAN harga master Ginee (placeholder Rp999.999 / seragam 87rb). Varian tanpa harga
// toko acuan → harga web dibiarkan. Mode (env GINEE_SYNC_PRICE):
//   "placeholder" (default) — hanya perbaiki harga web yang placeholder (99.999 / 999.999)
//   "all"                   — samakan SEMUA harga web dengan harga jual Shopee
//   "false"                 — jangan ubah harga
//
// Cakupan: semua varian ber-SKU di produk yang TIDAK dikunci (syncLocked) — SKU web
// dicocokkan persis dengan master SKU Ginee. SKU tak ditemukan di gudang → dibiarkan.
import { db } from "@/lib/db";
import { gineeRequest } from "./client";
import { getGineeVariationPrices } from "./products";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { getDefaultWarehouseId } from "./orders";
import { isGineeConfigured } from "./config";

export type StockSyncResult = {
  ok: boolean;
  productsChecked: number;
  stockUpdated: number;
  priceUpdated: number;
  errors: string[];
};

type InventoryRow = {
  warehouseInventory?: { availableStock?: number };
  masterVariation?: { id?: string; masterSku?: string };
};

/** Stok tersedia per master SKU di gudang (+ id variasi untuk harga). */
export async function getWarehouseStockBySku(
  skus: string[],
  warehouseId: string,
): Promise<Map<string, { stock: number; variationId?: string }>> {
  const map = new Map<string, { stock: number; variationId?: string }>();
  for (let i = 0; i < skus.length; i += 50) {
    const chunk = skus.slice(i, i + 50);
    const res = await gineeRequest<{ content?: InventoryRow[] }>(
      "POST",
      "/openapi/warehouse-inventory/v1/sku/list",
      { warehouseId, masterSkuList: chunk, page: 0, size: 50 },
    );
    for (const r of res.data?.content ?? []) {
      const sku = r.masterVariation?.masterSku;
      if (!sku) continue;
      map.set(sku, {
        stock: Math.max(0, Math.floor(r.warehouseInventory?.availableStock ?? 0)),
        variationId: r.masterVariation?.id,
      });
    }
  }
  return map;
}

export async function runGineeStockSync(limit = 5000): Promise<StockSyncResult> {
  if (!isGineeConfigured()) {
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: ["Ginee belum dikonfigurasi."] };
  }

  const errors: string[] = [];
  const warehouseId = await getDefaultWarehouseId().catch(() => null);
  if (!warehouseId) {
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: ["Gudang Ginee tidak ditemukan."] };
  }

  const variants = await db.variant.findMany({
    where: { sku: { not: null }, product: { syncLocked: false } }, // lewati produk yg dikunci manual
    select: { id: true, sku: true, stock: true, price: true, productId: true },
    take: limit,
  });
  const skus = [...new Set(variants.map((v) => v.sku!).filter(Boolean))];

  // 1) Stok gudang per SKU
  let inv = new Map<string, { stock: number; variationId?: string }>();
  try {
    inv = await getWarehouseStockBySku(skus, warehouseId);
  } catch (e) {
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: [`Stok gudang gagal: ${e instanceof Error ? e.message : "?"}`] };
  }

  // 2) Harga per variationId (batch 200) — hanya bila diaktifkan
  const priceMode = process.env.GINEE_SYNC_PRICE || "placeholder";
  const syncPrice = priceMode !== "false";
  const varIds = [...new Set([...inv.values()].map((x) => x.variationId).filter((x): x is string => !!x))];
  const priceByVarId = new Map<string, number>();
  for (let i = 0; syncPrice && i < varIds.length; i += 200) {
    try {
      const map = await getGineeVariationPrices(varIds.slice(i, i + 200));
      for (const [id, p] of map) if (p.source === "shop") priceByVarId.set(id, p.price);
    } catch (e) {
      errors.push(`Harga batch gagal: ${e instanceof Error ? e.message : "?"}.`);
    }
  }

  // 3) Update varian yang berubah
  let stockUpdated = 0;
  let priceUpdated = 0;
  const updates: { id: string; data: { stock?: number; price?: number } }[] = [];
  const products = new Set<string>();
  for (const v of variants) {
    const row = inv.get(v.sku!);
    if (!row) continue; // SKU tak ada di gudang Ginee (mis. produk impor CSV) → biarkan
    products.add(v.productId);
    const data: { stock?: number; price?: number } = {};
    if (row.stock !== v.stock) data.stock = row.stock;
    const nextPrice = row.variationId ? priceByVarId.get(row.variationId) : undefined;
    const priceAllowed = priceMode === "all" || isPlaceholderPrice(v.price);
    if (nextPrice !== undefined && nextPrice !== v.price && priceAllowed) data.price = nextPrice;
    if (data.stock !== undefined || data.price !== undefined) {
      updates.push({ id: v.id, data });
      if (data.stock !== undefined) stockUpdated++;
      if (data.price !== undefined) priceUpdated++;
    }
  }
  // Tulis berkelompok (1 transaksi / 50 varian) — jauh lebih cepat dari update satu-satu.
  for (let i = 0; i < updates.length; i += 50) {
    await db.$transaction(updates.slice(i, i + 50).map((u) => db.variant.update({ where: { id: u.id }, data: u.data })));
  }

  const missing = skus.length - [...skus].filter((s) => inv.has(s)).length;
  if (missing > 0) errors.push(`${missing} SKU tidak ditemukan di gudang Ginee (stoknya tidak diubah).`);

  return { ok: true, productsChecked: products.size, stockUpdated, priceUpdated, errors };
}
