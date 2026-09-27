/** Format angka rupiah (integer) → "Rp89.000". Harga selalu integer di DB. */
export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

type DiscountLike = { percent: number; active: boolean; startAt: Date | null; endAt: Date | null };

/** Persen diskon terbesar yang sedang berlaku (aktif & dalam periode); 0 bila tak ada. */
export function activeDiscountPercent(discounts: DiscountLike[]): number {
  const now = Date.now();
  const p = discounts
    .filter((d) => d.active && (!d.startAt || d.startAt.getTime() <= now) && (!d.endAt || d.endAt.getTime() >= now))
    .map((d) => d.percent);
  return p.length ? Math.max(...p) : 0;
}

/** Harga setelah diskon persen (dibulatkan ke rupiah terdekat). */
export function applyDiscount(price: number, percent: number): number {
  if (!percent) return price;
  return Math.round(price * (1 - percent / 100));
}
