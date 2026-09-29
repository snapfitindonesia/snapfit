// Aturan koin member — murni (tanpa DB), dipakai server (lib/coins.ts) & client (checkout, PDP).
// Disetujui client 29 Sep 2026. 1 koin = Rp1.

export const COIN_CASHBACK_RATE = 0.02; // 2% nilai belanja dibayar (tanpa ongkir)
export const COIN_SIGNUP_BONUS = 2000; // akun baru
export const COIN_REVIEW_BONUS = 500; // ulasan disetujui admin
export const COIN_MAX_USE_RATE = 0.3; // pakai maks. 30% subtotal
export const COIN_MIN_USE = 1000; // saldo minimal agar bisa dipakai
export const COIN_EXPIRE_DAYS = 180; // hangus 6 bulan per perolehan
export const COIN_EXPIRE_NOTICE_DAYS = 7; // email pengingat H-7
export const COIN_AUTO_DONE_DAYS = 7; // cashback otomatis 7 hari setelah Dikirim (bila admin tak menandai Selesai)

/** Cashback untuk nilai belanja yang dibayar (total − ongkir). */
export function cashbackFor(paidGoods: number): number {
  return Math.max(0, Math.floor(paidGoods * COIN_CASHBACK_RATE));
}

/**
 * Koin yang bisa dipakai: maks. 30% subtotal, tak boleh memotong ongkir (≤ total sebelum koin −
 * ongkir), dan hanya bila saldo ≥ minimum. 0 = tak bisa dipakai.
 */
export function maxCoinsUsable(balance: number, subtotal: number, totalBeforeCoins: number, shippingCost: number): number {
  if (balance < COIN_MIN_USE) return 0;
  const cap = Math.min(Math.floor(subtotal * COIN_MAX_USE_RATE), Math.max(0, totalBeforeCoins - shippingCost));
  return Math.max(0, Math.min(balance, cap));
}
