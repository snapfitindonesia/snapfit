"use server";

import { db } from "@/lib/db";
import { computeVoucherBenefit, voucherLabel, type VoucherLike } from "@/lib/voucher";
import { FLAT_SHIPPING_COST, isFlatShipping, qualifiesFreeShipping } from "@/lib/payment";

export type VoucherPublic = {
  code: string;
  type: string;
  amount: number;
  minPurchase: number;
  maxBenefit: number;
  label: string;
};

/** Voucher aktif untuk ditampilkan (chip PDP / daftar di drawer). */
export async function getActiveVouchers(): Promise<VoucherPublic[]> {
  try {
    const vouchers = await db.voucher.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { amount: "desc" }],
    });
    return vouchers.map((v) => ({
      code: v.code,
      type: v.type,
      amount: v.amount,
      minPurchase: v.minPurchase,
      maxBenefit: v.maxBenefit,
      label: voucherLabel(v as VoucherLike),
    }));
  } catch {
    return [];
  }
}

export type ApplyVoucherResult =
  | { ok: true; code: string; label: string; discount: number; freeShipping: boolean }
  | { ok: false; error: string };

/**
 * Validasi & estimasi benefit voucher untuk UI (checkout/drawer).
 * Otoritatif tetap dihitung ulang di createOrder.
 */
export async function applyVoucher(code: string, subtotal: number): Promise<ApplyVoucherResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "Masukkan kode voucher." };

  const voucher = await db.voucher.findUnique({ where: { code: trimmed } });
  if (!voucher || !voucher.active) return { ok: false, error: "Voucher tidak ditemukan / tidak aktif." };

  // Estimasi ongkir untuk voucher GRATIS_ONGKIR (mode flat, sebelum ambang gratis ongkir).
  const shippingCost = isFlatShipping() && !qualifiesFreeShipping(subtotal) ? FLAT_SHIPPING_COST : 0;

  const benefit = computeVoucherBenefit(voucher as VoucherLike, subtotal, shippingCost);
  if (!benefit.valid) return { ok: false, error: benefit.reason };
  if (benefit.discount <= 0) {
    return { ok: false, error: benefit.freeShipping ? "Ongkir sudah gratis." : "Voucher belum memberi potongan." };
  }

  return {
    ok: true,
    code: trimmed,
    label: voucherLabel(voucher as VoucherLike),
    discount: benefit.discount,
    freeShipping: benefit.freeShipping,
  };
}
