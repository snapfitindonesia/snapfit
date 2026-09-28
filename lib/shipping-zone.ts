// Ongkir per provinsi (mode flat). Server-only: dipakai checkout (quote) & createOrder
// (otoritatif) — keduanya lewat fungsi yang sama agar angka tak pernah beda.
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { FLAT_SHIPPING_COST, freeShippingSubsidy } from "@/lib/payment";

/** Berat tertagih: dibulatkan ke atas per kg, minimal 1 kg (kebijakan umum kurir). */
export const billableKg = (weightGram: number) => Math.max(1, Math.ceil(weightGram / 1000));

export type ZoneQuote = {
  cost: number; // ongkir yang ditagih = fullCost − subsidy
  fullCost: number; // ongkir sebelum gratis ongkir
  subsidy: number; // potongan gratis ongkir (maks. FREE_SHIPPING_MAX)
  etd: string;
  free: boolean; // cost 0 (ongkir tertutup penuh oleh gratis ongkir)
  zone: boolean; // false = provinsi belum diatur → tarif flat
  available: boolean; // false = tidak ada kurir ke provinsi ini
  kg: number;
};

/** Hitung ongkir ke provinsi tujuan. Provinsi tanpa tarif → SHIPPING_FLAT_COST. */
export async function zoneQuote(provinceCode: string | null | undefined, weightGram: number, subtotal: number): Promise<ZoneQuote> {
  const kg = billableKg(weightGram);
  const z = provinceCode ? await db.shippingZone.findUnique({ where: { provinceCode } }) : null;
  if (z && !z.available) return { cost: 0, fullCost: 0, subsidy: 0, etd: "", free: false, zone: true, available: false, kg };
  const fullCost = z ? z.baseCost + (kg - 1) * z.perKg : FLAT_SHIPPING_COST;
  const subsidy = freeShippingSubsidy(subtotal, fullCost);
  const cost = fullCost - subsidy;
  return { cost, fullCost, subsidy, etd: z?.etd ?? "", free: cost === 0, zone: !!z, available: true, kg };
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
