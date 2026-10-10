"use server";

import { db } from "@/lib/db";
import { applyDiscount, activeDiscountPercent } from "@/lib/format";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { limitAction, requestIp } from "@/lib/security/ratelimit";

export type CartPrice = { variantId: string; price: number; stock: number; available: boolean };

/**
 * Harga TERKINI untuk isi keranjang (keranjang di browser menyimpan harga saat barang ditambah —
 * bisa basi bila flash sale berakhir / harga diubah). Rumus sama dengan pesanan (computeOrder),
 * jadi angka di keranjang & checkout = angka yang ditagih. Hanya data publik (harga & stok).
 */
export async function getCartPrices(variantIds: string[]): Promise<CartPrice[]> {
  const ids = [...new Set(variantIds.filter((x) => typeof x === "string" && x.length <= 100))].slice(0, 50);
  if (!ids.length) return [];
  if (!(await limitAction("cart-price", await requestIp(), 30, "60 s")).success) return [];
  const variants = await db.variant.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      price: true,
      stock: true,
      product: { select: { archived: true } },
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
    },
  });
  return variants.map((v) => ({
    variantId: v.id,
    price: applyDiscount(v.price, activeDiscountPercent(v.discounts)),
    stock: v.stock,
    available: !v.product.archived && !isPlaceholderPrice(v.price) && v.stock > 0,
  }));
}
