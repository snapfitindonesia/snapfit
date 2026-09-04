/** Format angka rupiah (integer) → "Rp89.000". Harga selalu integer di DB. */
export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

/** Harga setelah diskon persen (dibulatkan ke rupiah terdekat). */
export function applyDiscount(price: number, percent: number): number {
  if (!percent) return price;
  return Math.round(price * (1 - percent / 100));
}
