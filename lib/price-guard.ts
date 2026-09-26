/**
 * Pengaman harga placeholder. Data dari Ginee/marketplace kadang berisi harga
 * "dummy" berupa deretan angka 9 (Rp99.999 / Rp999.999 / Rp9.999.999) untuk
 * varian yang tidak dijual. Varian seperti ini dianggap TIDAK TERSEDIA di toko
 * (tak bisa dibeli, tak dihitung di harga "mulai dari", tak masuk feed) sampai
 * harganya diperbaiki di admin.
 *
 * CATATAN: jangan pakai batas nominal (mis. ≥ Rp900rb) — case premium (VRS,
 * Supcase untuk Fold/Duo) memang berharga Rp945rb–Rp1,7jt.
 */
export function isPlaceholderPrice(p: number): boolean {
  return p <= 0 || /^9{5,}$/.test(String(p));
}

/** Stok yang boleh dijual: 0 bila harganya placeholder. */
export function sellableStock(v: { price: number; stock: number }): number {
  return isPlaceholderPrice(v.price) ? 0 : v.stock;
}
