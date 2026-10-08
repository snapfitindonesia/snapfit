// Rekening tujuan transfer manual — diatur di Admin → Penjualan → Rekening Transfer (SiteSetting
// "payment.banks"). Murni (tanpa DB): dipakai form admin & server. Baca dari DB: lib/bank-settings.ts.
import { z } from "zod";

export const bankAccountSchema = z.object({
  bank: z.string().trim().min(2, "Nama bank wajib diisi").max(40),
  accountNumber: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d]/g, ""))
    .pipe(z.string().min(5, "Nomor rekening minimal 5 angka").max(20, "Nomor rekening terlalu panjang")),
  accountName: z.string().trim().min(2, "Nama pemilik wajib diisi").max(60),
});
export const bankAccountsSchema = z.array(bankAccountSchema).min(1, "Minimal 1 rekening").max(4, "Maksimal 4 rekening");

export type BankAccount = z.infer<typeof bankAccountSchema>;

/** Bawaan (sebelum admin menyimpan): dari env, lalu rekening awal toko. */
export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    bank: process.env.MANUAL_BANK_NAME ?? "BCA",
    accountNumber: process.env.MANUAL_BANK_NUMBER ?? "2680177875",
    accountName: process.env.MANUAL_BANK_HOLDER ?? "Sisca Hendrawan",
  },
];
