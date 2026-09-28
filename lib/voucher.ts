// Perhitungan benefit voucher — dipakai UI (estimasi) & server (otoritatif).
import { formatRupiah } from "@/lib/format";

export type VoucherLike = {
  code: string;
  type: string; // "POTONGAN" | "GRATIS_ONGKIR"
  amount: number;
  minPurchase: number;
  maxBenefit: number;
  active: boolean;
  stackable?: boolean;
};

export type VoucherBenefit =
  | { valid: true; discount: number; freeShipping: boolean }
  | { valid: false; reason: string };

/**
 * Hitung potongan voucher terhadap subtotal & ongkir.
 * - POTONGAN: potong sebesar amount (dibatasi maxBenefit & subtotal).
 * - GRATIS_ONGKIR: potong sebesar ongkir (dibatasi maxBenefit bila diisi).
 */
export function computeVoucherBenefit(
  v: VoucherLike,
  subtotal: number,
  shippingCost: number,
): VoucherBenefit {
  if (!v.active) return { valid: false, reason: "Voucher tidak aktif." };
  if (v.minPurchase > 0 && subtotal < v.minPurchase) {
    return { valid: false, reason: `Min. belanja ${formatRupiah(v.minPurchase)}.` };
  }
  if (v.type === "GRATIS_ONGKIR") {
    let d = shippingCost;
    if (v.maxBenefit > 0) d = Math.min(d, v.maxBenefit);
    return { valid: true, discount: Math.max(0, d), freeShipping: true };
  }
  // POTONGAN (default)
  let d = v.amount;
  if (v.maxBenefit > 0) d = Math.min(d, v.maxBenefit);
  d = Math.min(d, subtotal);
  return { valid: true, discount: Math.max(0, d), freeShipping: false };
}

/** Maks. voucher per pesanan: satu per jenis (POTONGAN + GRATIS_ONGKIR). */
export const MAX_VOUCHERS = 2;

type Combinable = { type: string; stackable?: boolean };

/**
 * Aturan gabung voucher: dua voucher bisa dipakai bersama hanya bila JENISNYA BEDA
 * (potongan + gratis ongkir) dan KEDUANYA ditandai "Bisa digabung" di admin.
 * Dua voucher sejenis tidak pernah bisa digabung.
 */
export function canCombine(a: Combinable, b: Combinable): boolean {
  return a.type !== b.type && !!a.stackable && !!b.stackable;
}

/** Pasang voucher `next` ke daftar: yang tak bisa digabung dengannya diganti. */
export function mergeVoucher<T extends Combinable & { code: string }>(current: T[], next: T): { list: T[]; replaced: T[] } {
  const others = current.filter((v) => v.code !== next.code);
  const keep = others.filter((v) => canCombine(v, next));
  return { list: [...keep, next], replaced: others.filter((v) => !keep.includes(v)) };
}

/** Label chip singkat untuk voucher (PDP & drawer). */
export function voucherLabel(v: VoucherLike): string {
  if (v.type === "GRATIS_ONGKIR") return "Gratis Ongkir";
  return `Potongan ${formatRupiah(v.amount)}`;
}
