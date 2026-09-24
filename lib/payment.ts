// Mode pembayaran & ongkir. DEFAULT = transfer manual (BCA) + ongkir flat,
// karena Midtrans/Biteship belum diverifikasi. Config & kode Midtrans/Biteship
// TETAP utuh — begitu terverifikasi, tinggal set env (tinggal colok):
//   PAYMENT_MODE=midtrans   → aktifkan pembayaran Midtrans Snap
//   SHIPPING_MODE=biteship  → aktifkan ongkir Biteship (pilih kurir)

/** Ongkir flat saat mode flat (rupiah). Override via env SHIPPING_FLAT_COST. */
export const FLAT_SHIPPING_COST = Number(process.env.SHIPPING_FLAT_COST ?? 5000);

/** Ambang belanja untuk GRATIS ONGKIR otomatis (rupiah). Override via env FREE_SHIPPING_MIN. 0 = nonaktif. */
export const FREE_SHIPPING_MIN = Number(process.env.FREE_SHIPPING_MIN ?? 150000);

/** True bila subtotal memenuhi ambang gratis ongkir (mode flat). */
export function qualifiesFreeShipping(subtotal: number): boolean {
  return FREE_SHIPPING_MIN > 0 && subtotal >= FREE_SHIPPING_MIN;
}

/** Rekening tujuan transfer manual. Override via env bila perlu. */
export const MANUAL_BANK = {
  bank: process.env.MANUAL_BANK_NAME ?? "BCA",
  accountNumber: process.env.MANUAL_BANK_NUMBER ?? "2680177875",
  accountName: process.env.MANUAL_BANK_HOLDER ?? "Sisca Hendrawan",
};

/** True = transfer manual (default). Set PAYMENT_MODE=midtrans utk Midtrans. */
export function isManualPayment(): boolean {
  return (process.env.PAYMENT_MODE ?? "manual") !== "midtrans";
}

/** True = ongkir flat (default). Set SHIPPING_MODE=biteship utk Biteship. */
export function isFlatShipping(): boolean {
  return (process.env.SHIPPING_MODE ?? "flat") !== "biteship";
}
