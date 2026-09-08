import { z } from "zod";

export const SORT_OPTIONS = ["terbaru", "termurah", "termahal"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** Query listing produk (filter tipe HP + sort + paginasi). Dipakai RSC & Route Handler. */
export const productQuerySchema = z.object({
  tipe: z.string().trim().min(1).optional(), // slug kategori: brand (tingkat 1) atau line (tingkat 2)
  model: z.string().trim().min(1).max(100).optional(), // tingkat 3: cocokkan variant.type (mis. "Galaxy Z Fold 8")
  grosir: z.coerce.boolean().optional(), // true = hanya produk berflag grosir
  q: z.string().trim().min(1).max(100).optional(), // pencarian teks (nama produk)
  sort: z.enum(SORT_OPTIONS).default("terbaru"),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(48).default(8),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
