import { z } from "zod";

const url = z.string().trim().url("URL gambar tidak valid");
const rupiah = z.coerce.number().int().min(0);

export const variantSchema = z.object({
  id: z.string().optional(), // ada = update, kosong = baru
  name: z.string().trim().min(1, "Nama varian wajib"),
  color: z.string().trim().optional().default(""), // dimensi 1 (warna)
  type: z.string().trim().optional().default(""), // dimensi 2 (tipe)
  sku: z.string().trim().min(1, "SKU wajib"),
  price: rupiah,
  stock: z.coerce.number().int().min(0),
  weight: z.coerce.number().int().min(1, "Berat minimal 1 gram"),
  image: url,
});

export const productSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, strip"),
  name: z.string().trim().min(1, "Nama produk wajib"),
  description: z.string().trim().optional().or(z.literal("")),
  coverImage: url,
  images: z.array(url).optional().default([]), // galeri foto tambahan (PDP)
  variantGroups: z
    .object({
      groups: z.array(
        z.object({
          name: z.string().trim().default(""),
          options: z.array(z.object({ value: z.string().trim().default(""), desc: z.string().trim().default("") })),
        }),
      ),
    })
    .nullable()
    .optional(), // nama & opsi variasi custom (label PDP)
  categoryId: z.string().optional().or(z.literal("")),
  isGrosir: z.coerce.boolean().optional().default(false), // tampil di halaman /grosir
  variants: z.array(variantSchema).min(1, "Minimal 1 varian"),
});

export const bannerSchema = z.object({
  type: z.enum(["MAIN", "ETALASE", "PROMO"]),
  image: url,
  targetUrl: z.string().trim().optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).default(0),
  active: z.coerce.boolean().default(true),
});

export const discountSchema = z.object({
  name: z.string().trim().min(1, "Nama diskon wajib"),
  percent: z.coerce.number().int().min(1).max(99),
  productIds: z.array(z.string()).min(1, "Pilih minimal 1 produk"),
  active: z.coerce.boolean().default(true),
  startAt: z.string().optional().or(z.literal("")),
  endAt: z.string().optional().or(z.literal("")),
});

export const voucherSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .regex(/^[A-Z0-9]+$/, "Kode: huruf besar & angka"),
  type: z.enum(["POTONGAN", "GRATIS_ONGKIR"]),
  amount: rupiah,
  minPurchase: rupiah,
  maxBenefit: rupiah,
  active: z.coerce.boolean().default(true),
});

export const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "DONE", "CANCELLED"] as const;

export const orderUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(ORDER_STATUSES),
  trackingNo: z.string().trim().optional().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type DiscountInput = z.infer<typeof discountSchema>;
export type VoucherInput = z.infer<typeof voucherSchema>;
export type OrderUpdateInput = z.infer<typeof orderUpdateSchema>;
