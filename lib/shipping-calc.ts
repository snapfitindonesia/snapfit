// Hitung ongkir per provinsi — MURNI (tanpa DB), dipakai lib/shipping-zone.ts (checkout & createOrder)
// dan tes (tests/shipping.test.ts). Tarif provinsi diambil dari DB oleh pemanggil.
import { freeShippingSubsidy } from "@/lib/payment";

/** Berat tertagih: dibulatkan ke atas per kg, minimal 1 kg (kebijakan umum kurir). */
export const billableKg = (weightGram: number) => Math.max(1, Math.ceil(weightGram / 1000));

export type ZoneRate = { baseCost: number; perKg: number; etd: string; available: boolean };

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

/** Ongkir untuk tarif provinsi `z` (null = belum diatur → `flatCost`). */
export function computeZoneQuote(z: ZoneRate | null, weightGram: number, subtotal: number, flatCost: number): ZoneQuote {
  const kg = billableKg(weightGram);
  if (z && !z.available) return { cost: 0, fullCost: 0, subsidy: 0, etd: "", free: false, zone: true, available: false, kg };
  const fullCost = z ? z.baseCost + (kg - 1) * z.perKg : flatCost;
  const subsidy = freeShippingSubsidy(subtotal, fullCost);
  const cost = fullCost - subsidy;
  return { cost, fullCost, subsidy, etd: z?.etd ?? "", free: cost === 0, zone: !!z, available: true, kg };
}
