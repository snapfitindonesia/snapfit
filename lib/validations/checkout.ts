import { z } from "zod";
import { provinceName } from "@/lib/wilayah";

export const cartLineSchema = z.object({
  variantId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
});

export const addressSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter"),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s]{8,20}$/, "Nomor telepon tidak valid"),
  email: z.string().trim().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().trim().min(5, "Alamat terlalu pendek"),
  // Wilayah dari dropdown (kode Kepmendagri, lib/wilayah). Nama ikut disimpan untuk
  // label/email/Ginee; "city" = nama kabupaten/kota (kompatibel dengan data lama).
  provinceCode: z.string().regex(/^\d{2}$/, "Pilih provinsi"),
  province: z.string().trim().min(2, "Pilih provinsi"),
  regencyCode: z.string().regex(/^\d{2}\.\d{2}$/, "Pilih kabupaten/kota"),
  city: z.string().trim().min(2, "Pilih kabupaten/kota"),
  districtCode: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/, "Pilih kecamatan"),
  district: z.string().trim().min(2, "Pilih kecamatan"),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Kode pos harus 5 digit"),
}).superRefine((a, ctx) => {
  // Konsistensi hierarki kode (mis. kecamatan harus di dalam kabupaten terpilih).
  if (provinceName(a.provinceCode) !== a.province) ctx.addIssue({ code: "custom", path: ["provinceCode"], message: "Pilih provinsi" });
  if (!a.regencyCode.startsWith(`${a.provinceCode}.`)) ctx.addIssue({ code: "custom", path: ["regencyCode"], message: "Pilih kabupaten/kota" });
  if (!a.districtCode.startsWith(`${a.regencyCode}.`)) ctx.addIssue({ code: "custom", path: ["districtCode"], message: "Pilih kecamatan" });
});

export const ratesRequestSchema = z.object({
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Kode pos harus 5 digit"),
  items: z.array(cartLineSchema).min(1),
});

export const createOrderSchema = z.object({
  address: addressSchema,
  items: z.array(cartLineSchema).min(1),
  // Opsional: hanya dipakai saat ongkir Biteship aktif. Mode flat tak butuh.
  rateId: z.string().optional().or(z.literal("")),
  // Opsional: kode voucher yang diterapkan pembeli (divalidasi ulang di server).
  voucherCode: z.string().trim().optional().or(z.literal("")),
  // Opsional: catatan pembeli untuk penjual.
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CartLine = z.infer<typeof cartLineSchema>;
