import { activeDiscountPercent, applyDiscount } from "@/lib/format";
import type { CartLine } from "@/lib/validations/checkout";

/**
 * Gabungkan baris keranjang dengan varian sama → stok dicek terhadap JUMLAH total, bukan per baris
 * (mis. 3 + 2 untuk stok 4 harus ditolak). Urutan kemunculan pertama dipertahankan.
 */
export function mergeLines(lines: CartLine[]): CartLine[] {
  const m = new Map<string, number>();
  for (const l of lines) m.set(l.variantId, (m.get(l.variantId) ?? 0) + l.qty);
  return [...m].map(([variantId, qty]) => ({ variantId, qty }));
}

export type PricedVariant = {
  id: string;
  weight: number; // gram
  price: number; // sebelum diskon
  discounts?: { percent: number; active: boolean; startAt: Date | null; endAt: Date | null }[];
};

/**
 * Berat & subtotal keranjang — SATU rumus untuk perkiraan ongkir di checkout (quoteShipping), cek tarif
 * (/api/shipping/rates) dan pesanan (createOrder), agar angka yang tampil = angka yang ditagih.
 * Subtotal memakai harga SETELAH diskon varian yang sedang berlaku. Varian tak ditemukan → `missing`.
 */
export function cartTotals(lines: CartLine[], variants: PricedVariant[]): { weight: number; subtotal: number; missing: string[] } {
  const byId = new Map(variants.map((v) => [v.id, v]));
  let weight = 0;
  let subtotal = 0;
  const missing: string[] = [];
  for (const line of lines) {
    const v = byId.get(line.variantId);
    if (!v) {
      missing.push(line.variantId);
      continue;
    }
    weight += v.weight * line.qty;
    subtotal += applyDiscount(v.price, activeDiscountPercent(v.discounts ?? [])) * line.qty;
  }
  return { weight, subtotal, missing };
}
