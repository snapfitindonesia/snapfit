import { z } from "zod";
import { campaignWindow } from "@/lib/campaigns";

// Promo cashback berjadwal: ikut jadwal kampanye berulang (Payday 25–28, tanggal kembar) atau
// rentang tanggal sendiri (WIB). Saat beberapa promo berjalan bersamaan → persen tertinggi.
export const coinPromoSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1, "Nama promo wajib diisi.").max(40),
  percent: z.number().min(0).max(50),
  kind: z.enum(["payday-sale", "tanggal-kembar", "custom"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")), // custom: YYYY-MM-DD (WIB)
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  active: z.boolean(),
});
export type CoinPromo = z.infer<typeof coinPromoSchema>;

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
  promos: z.array(coinPromoSchema).max(10).default([]),
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
  promos: [],
};

/** Gabung nilai tersimpan dengan default (kolom baru/rusak → default). */
export function normalizeCoinRules(raw: unknown): CoinRules {
  const r = coinRulesSchema.partial().safeParse(raw);
  return { ...DEFAULT_COIN_RULES, ...(r.success ? r.data : {}) };
}

/** 00:00 WIB tanggal "YYYY-MM-DD". */
const wibDay = (ymd: string, addDays = 0) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + addDays, -7));
};

/** Rentang promo yang sedang berjalan / berikutnya (null = tak terjadwal / sudah lewat). */
export function promoWindow(p: CoinPromo, now = new Date()): { start: Date; end: Date; live: boolean } | null {
  if (p.kind !== "custom") return campaignWindow(p.kind, now);
  if (!p.start || !p.end) return null;
  const start = wibDay(p.start);
  const end = wibDay(p.end, 1); // s/d akhir hari tanggal selesai
  if (end.getTime() <= now.getTime() || end <= start) return null;
  return { start, end, live: start.getTime() <= now.getTime() };
}

export type ActiveCashback = { percent: number; promo: string | null; until: string | null };

/** Persen cashback yang berlaku SEKARANG (dasar atau promo tertinggi yang berjalan). */
export function activeCashback(rules: CoinRules, now = new Date()): ActiveCashback {
  if (!rules.enabled) return { percent: 0, promo: null, until: null };
  let best: ActiveCashback = { percent: rules.cashbackPercent, promo: null, until: null };
  for (const p of rules.promos ?? []) {
    if (!p.active || p.percent <= best.percent) continue;
    const w = promoWindow(p, now);
    if (w?.live) best = { percent: p.percent, promo: p.label, until: w.end.toISOString() };
  }
  return best;
}

/** Cashback untuk nilai belanja yang dibayar (total − ongkir) dengan persen tertentu. */
export function cashbackFor(paidGoods: number, percent: number): number {
  return Math.max(0, Math.floor((paidGoods * percent) / 100));
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
