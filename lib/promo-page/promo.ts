// Produk peserta Buy 1 Get 1 yang SEDANG berlaku (server) — dipakai computeOrder, quoteShipping & getCartPrices.
import { getPromoPageConfig } from "@/lib/promo-page/settings";
import { b1g1Discount } from "@/lib/b1g1";
import { activeDiscountPercent, applyDiscount } from "@/lib/format";

/** Produk "hanya di halaman promo" — disembunyikan dari seluruh website kecuali /buy1get1. */
export async function getPromoHiddenIds(): Promise<Set<string>> {
  const c = await getPromoPageConfig();
  const listed = new Set(c.products.productIds);
  return new Set(c.products.hiddenIds.filter((id) => listed.has(id)));
}

export async function getB1G1ProductIds(): Promise<Set<string>> {
  const c = await getPromoPageConfig();
  return c.products.promoActive ? new Set(c.products.productIds) : new Set();
}

/** Potongan Buy 1 Get 1 untuk baris keranjang (harga unit = harga setelah diskon varian, sama dengan cartTotals). */
export async function b1g1ForLines(
  lines: { variantId: string; qty: number }[],
  variants: { id: string; productId: string; price: number; discounts?: { percent: number; active: boolean; startAt: Date | null; endAt: Date | null }[] }[],
): Promise<number> {
  const promo = await getB1G1ProductIds();
  if (!promo.size) return 0;
  const byId = new Map(variants.map((v) => [v.id, v]));
  return b1g1Discount(
    lines.flatMap((l) => {
      const v = byId.get(l.variantId);
      return v ? [{ variantId: v.id, unitPrice: applyDiscount(v.price, activeDiscountPercent(v.discounts ?? [])), qty: l.qty, eligible: promo.has(v.productId) }] : [];
    }),
  ).discount;
}
