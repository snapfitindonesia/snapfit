/**
 * Pengaman harga placeholder. Data dari Ginee/marketplace kadang berisi harga
 * "dummy" (Rp999.999 di master Ginee, Rp99.999 di Shopee). Varian dengan harga
 * seperti ini dianggap TIDAK TERSEDIA di toko (tak bisa dibeli, tak dihitung di
 * harga "mulai dari", tak masuk feed) sampai harganya diperbaiki di admin.
 */
export const MAX_SANE_PRICE = 900_000;

export function isPlaceholderPrice(p: number): boolean {
  return p <= 0 || p >= MAX_SANE_PRICE || /^9{5,}$/.test(String(p));
}

/** Stok yang boleh dijual: 0 bila harganya placeholder. */
export function sellableStock(v: { price: number; stock: number }): number {
  return isPlaceholderPrice(v.price) ? 0 : v.stock;
}
