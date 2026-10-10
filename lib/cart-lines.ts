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
