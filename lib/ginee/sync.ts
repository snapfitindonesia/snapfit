// Sinkron STOK + HARGA Ginee → web (pull). Dipakai server action (tombol admin) & cron.
// Sumber kebenaran = Ginee. 2 tahap agar hemat panggilan:
//  Tahap 1 (per produk): ListMasterProduct by sku → stok per sku + peta variationId↔sku.
//  Tahap 2 (batch): list-price by SEMUA variationIds sekaligus (chunk 200) → harga.
import { db } from "@/lib/db";
import { getGineeProductBySku, getGineeVariationPrices } from "./products";
import { isGineeConfigured } from "./config";

export type StockSyncResult = {
  ok: boolean;
  productsChecked: number;
  stockUpdated: number;
  priceUpdated: number;
  errors: string[];
};

type Pending = {
  variantId: string;
  currentStock: number;
  currentPrice: number;
  nextStock?: number;
  gineeVarId?: string;
};

export async function runGineeStockSync(limit = 1000): Promise<StockSyncResult> {
  if (!isGineeConfigured()) {
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: ["Ginee belum dikonfigurasi."] };
  }

  const products = await db.product.findMany({
    where: { gineeProductId: { not: null }, syncLocked: false }, // lewati produk yg dikunci manual
    select: { id: true, name: true, variants: { select: { id: true, sku: true, stock: true, price: true } } },
    take: limit,
  });

  const errors: string[] = [];
  const pending: Pending[] = [];
  const allVarIds: string[] = [];

  // Tahap 1: stok + peta variationId per produk
  for (const p of products) {
    const firstSku = p.variants.find((v) => v.sku)?.sku;
    if (!firstSku) continue;
    try {
      const mp = await getGineeProductBySku(firstSku);
      if (!mp) {
        errors.push(`"${p.name.slice(0, 30)}": tak ditemukan di Ginee.`);
        continue;
      }
      const briefs = mp.variationBriefs ?? [];
      const stockBySku = new Map<string, number>();
      const varIdBySku = new Map<string, string>();
      for (const b of briefs) {
        if (b.sku) stockBySku.set(b.sku, Math.max(0, b.stock?.availableStock ?? 0));
        if (b.sku && b.id) varIdBySku.set(b.sku, b.id);
      }
      for (const v of p.variants) {
        if (!v.sku) continue; // tanpa SKU → tak bisa dicocokkan ke Ginee
        const gineeVarId = varIdBySku.get(v.sku);
        if (gineeVarId) allVarIds.push(gineeVarId);
        pending.push({
          variantId: v.id,
          currentStock: v.stock,
          currentPrice: v.price,
          nextStock: stockBySku.get(v.sku),
          gineeVarId,
        });
      }
    } catch (e) {
      errors.push(`"${p.name.slice(0, 30)}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
  }

  // Tahap 2: harga per variationId (batch 200)
  const priceByVarId = new Map<string, number>();
  for (let i = 0; i < allVarIds.length; i += 200) {
    const chunk = allVarIds.slice(i, i + 200);
    try {
      const map = await getGineeVariationPrices(chunk);
      for (const [id, p] of map) if (p.price > 0) priceByVarId.set(id, p.price);
    } catch (e) {
      errors.push(`Harga batch gagal: ${e instanceof Error ? e.message : "?"}.`);
    }
  }

  // Update
  let stockUpdated = 0;
  let priceUpdated = 0;
  for (const pen of pending) {
    const data: { stock?: number; price?: number } = {};
    if (pen.nextStock !== undefined && pen.nextStock !== pen.currentStock) data.stock = pen.nextStock;
    const nextPrice = pen.gineeVarId ? priceByVarId.get(pen.gineeVarId) : undefined;
    if (nextPrice !== undefined && nextPrice !== pen.currentPrice) data.price = nextPrice;
    if (data.stock !== undefined || data.price !== undefined) {
      await db.variant.update({ where: { id: pen.variantId }, data });
      if (data.stock !== undefined) stockUpdated++;
      if (data.price !== undefined) priceUpdated++;
    }
  }

  return { ok: true, productsChecked: products.length, stockUpdated, priceUpdated, errors };
}
