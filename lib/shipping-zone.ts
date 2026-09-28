// Ongkir per provinsi (mode flat). Server-only: dipakai checkout (quote) & createOrder
// (otoritatif) — keduanya lewat fungsi yang sama agar angka tak pernah beda.
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { FLAT_SHIPPING_COST, qualifiesFreeShipping } from "@/lib/payment";

/** Berat tertagih: dibulatkan ke atas per kg, minimal 1 kg (kebijakan umum kurir). */
export const billableKg = (weightGram: number) => Math.max(1, Math.ceil(weightGram / 1000));

export type ZoneQuote = {
  cost: number; // ongkir yang ditagih (0 bila gratis ongkir)
  fullCost: number; // ongkir sebelum gratis ongkir
  etd: string;
  free: boolean;
  zone: boolean; // false = provinsi belum diatur → tarif flat
  kg: number;
};

/** Hitung ongkir ke provinsi tujuan. Provinsi tanpa tarif → SHIPPING_FLAT_COST. */
export async function zoneQuote(provinceCode: string | null | undefined, weightGram: number, subtotal: number): Promise<ZoneQuote> {
  const kg = billableKg(weightGram);
  const z = provinceCode ? await db.shippingZone.findUnique({ where: { provinceCode } }) : null;
  const fullCost = z ? z.baseCost + (kg - 1) * z.perKg : FLAT_SHIPPING_COST;
  const free = qualifiesFreeShipping(subtotal);
  return { cost: free ? 0 : fullCost, fullCost, etd: z?.etd ?? "", free, zone: !!z, kg };
}

export const ZONES_TAG = "shipping-zones";

/**
 * Ringkasan untuk keranjang: null = belum ada tarif per provinsi (tetap flat); selain itu
 * ongkir termurah (termasuk tarif flat bila masih ada provinsi yang belum diatur).
 * Di-cache 5 mnt; saveShippingZones memperbarui lewat tag.
 */
export const zoneStartingCost = unstable_cache(
  async (): Promise<number | null> => {
    const agg = await db.shippingZone.aggregate({ _count: true, _min: { baseCost: true } });
    if (!agg._count) return null;
    const min = agg._min.baseCost ?? FLAT_SHIPPING_COST;
    return agg._count < 38 ? Math.min(min, FLAT_SHIPPING_COST) : min;
  },
  ["zone-starting-cost"],
  { revalidate: 300, tags: [ZONES_TAG] },
);
