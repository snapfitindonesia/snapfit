import { db } from "@/lib/db";
import { productSegment } from "@/lib/product-url";
import { applyDiscount, activeDiscountPercent } from "@/lib/format";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { storefrontCached } from "@/lib/storefront-cache";

// Bundle di keranjang ("Sering dibeli bersama"): admin memilih VARIAN spesifik (Admin → Tampilan
// Toko → Bundle Keranjang). Disimpan di SiteSetting "cart.bundles"; data toko di-cache (tag
// storefront — segar saat admin menyimpan, sinkron stok Ginee, atau ubah diskon).

export const BUNDLE_KEY = "cart.bundles";
export { MAX_BUNDLES, bundleConfigSchema, DEFAULT_BUNDLE_CONFIG, type BundleConfig, type BundleItem } from "@/lib/bundles-shared";
import { bundleConfigSchema, DEFAULT_BUNDLE_CONFIG, type BundleConfig, type BundleItem } from "@/lib/bundles-shared";

export async function getBundleConfig(): Promise<BundleConfig> {
  const row = await db.siteSetting.findUnique({ where: { key: BUNDLE_KEY } });
  const r = bundleConfigSchema.safeParse(row?.value);
  return r.success ? r.data : DEFAULT_BUNDLE_CONFIG;
}

/** Varian bundle siap tampil (urutan admin), tanpa yang stok habis / diarsip / harga dummy. */
export async function loadBundleItems(variantIds: string[]): Promise<BundleItem[]> {
  if (!variantIds.length) return [];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      image: true,
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
      product: { select: { slug: true, shortId: true, name: true, coverImage: true, archived: true } },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  return variantIds
    .map((id) => byId.get(id))
    .filter((v): v is NonNullable<typeof v> => !!v && v.stock > 0 && !v.product.archived && !isPlaceholderPrice(v.price))
    .map((v) => ({
      variantId: v.id,
      productSlug: productSegment(v.product), // segmen URL
      productName: v.product.name,
      variantName: v.name,
      image: v.image || v.product.coverImage,
      price: v.price,
      finalPrice: applyDiscount(v.price, activeDiscountPercent(v.discounts)),
    }));
}

/** Untuk drawer keranjang (di-cache). */
export const getCartBundles = storefrontCached(
  "cart-bundles",
  { title: DEFAULT_BUNDLE_CONFIG.title, items: [] as BundleItem[] },
  async () => {
    const cfg = await getBundleConfig();
    if (!cfg.enabled) return { title: cfg.title, items: [] as BundleItem[] };
    return { title: cfg.title, items: await loadBundleItems(cfg.variantIds) };
  },
);
