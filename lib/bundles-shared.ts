import { z } from "zod";

// Bagian murni (tanpa DB) dari lib/bundles.ts — aman diimpor komponen client (admin editor, drawer).
export const MAX_BUNDLES = 12;

export const bundleConfigSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(1).max(60),
  variantIds: z.array(z.string().min(1)).max(MAX_BUNDLES),
});
export type BundleConfig = z.infer<typeof bundleConfigSchema>;
export const DEFAULT_BUNDLE_CONFIG: BundleConfig = { enabled: true, title: "Sering dibeli bersama", variantIds: [] };

export type BundleItem = {
  variantId: string;
  productSlug: string;
  productName: string;
  variantName: string;
  image: string;
  price: number; // harga normal
  finalPrice: number; // setelah diskon aktif (Admin → Diskon)
};

