// Ongkir per provinsi (mode flat). Server-only: dipakai checkout (quote) & createOrder
// (otoritatif) — keduanya lewat fungsi yang sama agar angka tak pernah beda.
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { FLAT_SHIPPING_COST } from "@/lib/payment";
import { computeZoneQuote, type ZoneQuote } from "@/lib/shipping-calc";

export { billableKg } from "@/lib/shipping-calc";
export type { ZoneQuote } from "@/lib/shipping-calc";

/** Hitung ongkir ke provinsi tujuan. Provinsi tanpa tarif → SHIPPING_FLAT_COST. */
export async function zoneQuote(provinceCode: string | null | undefined, weightGram: number, subtotal: number): Promise<ZoneQuote> {
  const z = provinceCode ? await db.shippingZone.findUnique({ where: { provinceCode } }) : null;
  return computeZoneQuote(z, weightGram, subtotal, FLAT_SHIPPING_COST);
}

export const ZONES_TAG = "shipping-zones";

/**
 * Ringkasan untuk keranjang: null = belum ada tarif per provinsi (tetap flat); selain itu
 * ongkir termurah (termasuk tarif flat bila masih ada provinsi yang belum diatur).
 * Di-cache 5 mnt; saveShippingZones memperbarui lewat tag.
 */
export const zoneStartingCost = unstable_cache(
  async (): Promise<number | null> => {
    const [rows, agg] = await Promise.all([
      db.shippingZone.count(),
      db.shippingZone.aggregate({ where: { available: true }, _min: { baseCost: true } }),
    ]);
    if (!rows) return null;
    const min = agg._min.baseCost ?? FLAT_SHIPPING_COST;
    return rows < 38 ? Math.min(min, FLAT_SHIPPING_COST) : min;
  },
  ["zone-starting-cost"],
  { revalidate: 300, tags: [ZONES_TAG] },
);
