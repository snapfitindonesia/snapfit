import { z } from "zod";

// Formulir Kerja Sama Bisnis (/bisnis). Dipakai bersama oleh formulir (browser) & Server Action.
export const BUSINESS_TYPES = [
  "Reseller / toko",
  "Corporate gift / custom logo",
  "Pengadaan perusahaan / instansi",
  "Lainnya",
] as const;

export const BUSINESS_VOLUMES = ["Kurang dari 50 pcs", "50–200 pcs", "200–1.000 pcs", "Lebih dari 1.000 pcs", "Belum tahu"] as const;

export const businessInquirySchema = z.object({
  name: z.string().trim().min(2, "Isi nama kamu").max(80),
  company: z.string().trim().max(120).default(""),
  email: z.string().trim().max(120).email("Email tidak valid"),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[\d\s-]{9,20}$/, "Nomor WhatsApp tidak valid"),
  city: z.string().trim().max(80).default(""),
  type: z.enum(BUSINESS_TYPES, { message: "Pilih jenis kerja sama" }),
  volume: z.enum(BUSINESS_VOLUMES, { message: "Pilih perkiraan jumlah" }),
  message: z.string().trim().max(2000, "Pesan maks. 2.000 karakter").default(""),
  /** Jebakan bot: kolom tersembunyi, manusia tak pernah mengisinya. */
  website: z.string().max(200).optional(),
});

export type BusinessInquiryInput = z.input<typeof businessInquirySchema>;
