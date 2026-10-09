"use server";

import { unstable_cache } from "next/cache";
import { isLimited, limitAction, requestIp } from "@/lib/security/ratelimit";
import { db } from "@/lib/db";
import { computeVoucherBenefit, voucherLabel, type VoucherLike } from "@/lib/voucher";
import { FLAT_SHIPPING_COST, freeShippingSubsidy, isFlatShipping } from "@/lib/payment";

export type VoucherPublic = {
  code: string;
  type: string;
  amount: number;
  minPurchase: number;
  maxBenefit: number;
  stackable: boolean;
  label: string;
};

// Di-cache bertag: saveVoucher/deleteVoucher memanggil revalidateTag("vouchers") sehingga
// checkout/PDP/promo (ISR) langsung memakai daftar terbaru (dulu tertahan s/d 5 menit →
// kode yang sudah diganti di admin masih tampil & gagal dipakai).
const activeVouchersCached = unstable_cache(
  async (): Promise<VoucherPublic[]> => {
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
      stackable: v.stackable,
      label: voucherLabel(v as VoucherLike),
    }));
  },
  ["active-vouchers"],
  { revalidate: 300, tags: ["vouchers"] },
);

/** Voucher aktif untuk ditampilkan (chip PDP / daftar voucher checkout). */
export async function getActiveVouchers(): Promise<VoucherPublic[]> {
  try {
    return await activeVouchersCached();
  } catch {
    return [];
  }
}

export type ApplyVoucherResult =
  | { ok: true; code: string; label: string; discount: number; freeShipping: boolean; type: string; stackable: boolean }
  | { ok: false; error: string };

/**
 * Validasi & estimasi benefit voucher untuk UI (checkout/drawer).
 * Otoritatif tetap dihitung ulang di createOrder.
 */
/** `shippingEstimate`: ongkir dari quote checkout (hanya estimasi — createOrder menghitung ulang). */
export async function applyVoucher(code: string, subtotal: number, shippingEstimate?: number): Promise<ApplyVoucherResult> {
  const trimmed = code.trim().toUpperCase().slice(0, 40);
  if (!trimmed) return { ok: false, error: "Masukkan kode voucher." };

  // Anti tebak kode: maks. 10 kode SALAH / 10 menit / IP. Hanya kode salah yang dihitung, jadi
  // cek ulang voucher yang sudah terpasang (tiap isi keranjang berubah) tak pernah terblokir.
  const ip = await requestIp();
  if (await isLimited("voucher-miss", ip, 10, "10 m")) {
    return { ok: false, error: "Terlalu banyak kode voucher salah. Coba lagi 10 menit lagi." };
  }

  const voucher = await db.voucher.findUnique({ where: { code: trimmed } });
  if (!voucher || !voucher.active) {
    await limitAction("voucher-miss", ip, 10, "10 m");
    return { ok: false, error: "Voucher tidak ditemukan / tidak aktif." };
  }

  // Estimasi sisa ongkir (setelah gratis ongkir) untuk voucher GRATIS_ONGKIR: dari quote
  // checkout bila ada, else tarif flat dikurangi gratis ongkir.
  const est = Number.isFinite(shippingEstimate)
    ? Math.min(Math.max(0, Math.round(shippingEstimate!)), 5_000_000)
    : FLAT_SHIPPING_COST - freeShippingSubsidy(subtotal, FLAT_SHIPPING_COST);
  const shippingCost = isFlatShipping() ? est : 0;

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
    type: voucher.type,
    stackable: voucher.stackable,
  };
}
