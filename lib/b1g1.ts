// Promo Buy 1 Get 1 (produk peserta: Admin → Halaman Buy 1 Get 1 → Produk promo). SATU rumus untuk server
// (computeOrder/quoteShipping — otoritatif) & browser (keranjang/checkout — tampilan), jadi angka sama.
//
// Aturan: semua UNIT produk peserta di keranjang dikumpulkan (boleh beda produk/varian); tiap 2 unit → 1 gratis,
// yaitu unit TERMURAH. Contoh: Rp100rb + Rp90rb + Rp10rb + Rp5rb → gratis Rp10rb & Rp5rb (2 termurah dari 4).
// Harga unit = harga setelah diskon varian yang berlaku (sama dengan subtotal).

export const B1G1_LABEL = "Promo Buy 1 Get 1";

export type B1G1Line = { variantId: string; unitPrice: number; qty: number; eligible: boolean };
export type B1G1Result = {
  /** Total potongan (rupiah). */
  discount: number;
  /** Jumlah unit gratis per varian (untuk label "Gratis" di keranjang). */
  free: Record<string, number>;
  /** Unit peserta di keranjang (untuk ajakan "tambah 1 lagi"). */
  eligibleUnits: number;
};

export function b1g1Discount(lines: B1G1Line[]): B1G1Result {
  const units: { variantId: string; price: number }[] = [];
  for (const l of lines) {
    if (!l.eligible || l.qty <= 0 || l.unitPrice <= 0) continue;
    for (let i = 0; i < Math.min(l.qty, 1000); i++) units.push({ variantId: l.variantId, price: Math.round(l.unitPrice) });
  }
  units.sort((a, b) => a.price - b.price);
  const freeCount = Math.floor(units.length / 2);
  const free: Record<string, number> = {};
  let discount = 0;
  for (const u of units.slice(0, freeCount)) {
    discount += u.price;
    free[u.variantId] = (free[u.variantId] ?? 0) + 1;
  }
  return { discount, free, eligibleUnits: units.length };
}
