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
  archived?: number; // produk disembunyikan krn sudah dihapus di Ginee
  restored?: number; // produk terarsip yang muncul lagi di Ginee
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

  // Produk yang sudah DIHAPUS di Ginee → arsipkan (sembunyikan dari toko/feed).
  let archived = 0;
  let restored = 0;
  try {
    const a = await syncArchivedFromGinee();
    archived = a.archived;
    restored = a.restored;
    if (a.note) errors.push(a.note);
  } catch (e) {
    errors.push(`Cek produk terhapus gagal: ${e instanceof Error ? e.message : "?"}`);
  }

  return { ok: true, productsChecked: products.size, stockUpdated, priceUpdated, archived, restored, errors };
}

/**
 * Arsipkan produk yang master-nya sudah TIDAK ADA di Ginee (respons tegas
 * code DATA_NOT_EXISTED), dan pulihkan bila muncul lagi. Aman:
 *  - error jaringan/lainnya → produk TIDAK disentuh
 *  - produk dikunci (syncLocked) dilewati
 *  - bila >30% produk tiba-tiba "hilang" (anomali API) → batal, tak ada yang diarsipkan
 */
export async function syncArchivedFromGinee(): Promise<{ archived: number; restored: number; checked: number; note?: string }> {
  const products = await db.product.findMany({
    where: { gineeProductId: { not: null }, syncLocked: false },
    select: { id: true, gineeProductId: true, archived: true },
  });
  const missing: string[] = [];
  const present: string[] = [];
  let failed = 0;
  let i = 0;
  async function worker() {
    while (i < products.length) {
      const p = products[i++];
      try {
        const r = await gineeRequest<{ productId?: string }>("GET", "/openapi/product/master/v1/get", { productId: p.gineeProductId });
        if (String(r.code) === "DATA_NOT_EXISTED") missing.push(p.id);
        else if (r.data?.productId) present.push(p.id);
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));

  const checked = products.length - failed;
  if (checked > 10 && missing.length / checked > 0.3) {
    return { archived: 0, restored: 0, checked, note: `${missing.length}/${checked} produk tak ditemukan di Ginee — terlalu banyak (anomali?), pengarsipan dibatalkan.` };
  }
  const toArchive = products.filter((p) => missing.includes(p.id) && !p.archived).map((p) => p.id);
  const toRestore = products.filter((p) => present.includes(p.id) && p.archived).map((p) => p.id);
  if (toArchive.length) await db.product.updateMany({ where: { id: { in: toArchive } }, data: { archived: true } });
  if (toRestore.length) await db.product.updateMany({ where: { id: { in: toRestore } }, data: { archived: false } });
  return {
    archived: toArchive.length,
    restored: toRestore.length,
    checked,
    note: failed ? `${failed} produk gagal dicek di Ginee (tidak diubah).` : undefined,
  };
}
