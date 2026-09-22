// Sinkron stok Ginee → web (pull). Dipakai server action (tombol admin) & cron.
// Sumber kebenaran stok = Ginee. Untuk tiap produk hasil impor (punya
// gineeProductId), baca availableStock terkini per SKU lalu update Variant.stock.
import { db } from "@/lib/db";
import { getGineeProductBySku, stockMapFromProduct } from "./products";
import { isGineeConfigured } from "./config";

export type StockSyncResult = {
  ok: boolean;
  productsChecked: number;
  variantsUpdated: number;
  errors: string[];
};

export async function runGineeStockSync(limit = 500): Promise<StockSyncResult> {
  if (!isGineeConfigured()) {
    return { ok: false, productsChecked: 0, variantsUpdated: 0, errors: ["Ginee belum dikonfigurasi."] };
  }

  const products = await db.product.findMany({
    where: { gineeProductId: { not: null } },
    select: { id: true, name: true, variants: { select: { id: true, sku: true, stock: true } } },
    take: limit,
  });

  const errors: string[] = [];
  let variantsUpdated = 0;

  for (const p of products) {
    const firstSku = p.variants.find((v) => v.sku)?.sku;
    if (!firstSku) continue;
    try {
      const mp = await getGineeProductBySku(firstSku);
      if (!mp) {
        errors.push(`"${p.name.slice(0, 30)}": tak ditemukan di Ginee.`);
        continue;
      }
      const stock = stockMapFromProduct(mp);
      for (const v of p.variants) {
        const next = stock.get(v.sku);
        if (next !== undefined && next !== v.stock) {
          await db.variant.update({ where: { id: v.id }, data: { stock: next } });
          variantsUpdated++;
        }
      }
    } catch (e) {
      errors.push(`"${p.name.slice(0, 30)}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
  }

  return { ok: true, productsChecked: products.length, variantsUpdated, errors };
}
