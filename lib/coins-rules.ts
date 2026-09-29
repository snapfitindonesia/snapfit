import { z } from "zod";

// Aturan koin member — murni (tanpa DB), dipakai server (lib/coins.ts) & client (checkout, PDP).
// Nilai diatur di Admin → Pelanggan → Koin Member (SiteSetting "coins.rules", lib/coins-settings.ts);
// DEFAULT = aturan yang disetujui client 29 Sep 2026. 1 koin = Rp1.

export const coinRulesSchema = z.object({
  enabled: z.boolean(), // false = tak ada koin baru (cashback/bonus); saldo lama tetap bisa dipakai
  cashbackPercent: z.number().min(0).max(50), // % nilai belanja dibayar (tanpa ongkir)
  signupBonus: z.number().int().min(0).max(1_000_000),
  reviewBonus: z.number().int().min(0).max(1_000_000),
  maxUsePercent: z.number().min(0).max(100), // pakai maks. % subtotal
  minUse: z.number().int().min(0).max(1_000_000), // saldo minimal agar bisa dipakai
  expireDays: z.number().int().min(7).max(1095), // masa berlaku tiap perolehan
  expireNoticeDays: z.number().int().min(0).max(60), // email pengingat H-x (0 = tanpa email)
  autoDoneDays: z.number().int().min(1).max(60), // cashback otomatis x hari setelah Dikirim
});
export type CoinRules = z.infer<typeof coinRulesSchema>;

export const DEFAULT_COIN_RULES: CoinRules = {
  enabled: true,
  cashbackPercent: 2,
  signupBonus: 2000,
  reviewBonus: 500,
  maxUsePercent: 30,
  minUse: 1000,
  expireDays: 180,
  expireNoticeDays: 7,
  autoDoneDays: 7,
};

/** Gabung nilai tersimpan dengan default (kolom baru/rusak → default). */
export function normalizeCoinRules(raw: unknown): CoinRules {
  const r = coinRulesSchema.partial().safeParse(raw);
  return { ...DEFAULT_COIN_RULES, ...(r.success ? r.data : {}) };
}

/** Cashback untuk nilai belanja yang dibayar (total − ongkir). */
export function cashbackFor(paidGoods: number, rules: CoinRules): number {
  if (!rules.enabled) return 0;
  return Math.max(0, Math.floor((paidGoods * rules.cashbackPercent) / 100));
}

/**
 * Koin yang bisa dipakai: maks. x% subtotal, tak boleh memotong ongkir (≤ total sebelum koin −
 * ongkir), dan hanya bila saldo ≥ minimum. 0 = tak bisa dipakai.
 */
export function maxCoinsUsable(
  balance: number,
  subtotal: number,
  totalBeforeCoins: number,
  shippingCost: number,
  rules: CoinRules,
): number {
  if (balance <= 0 || balance < rules.minUse) return 0;
  const cap = Math.min(Math.floor((subtotal * rules.maxUsePercent) / 100), Math.max(0, totalBeforeCoins - shippingCost));
  return Math.max(0, Math.min(balance, cap));
}

/** "2%" / "2,5%" */
export const pct = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
