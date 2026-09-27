// Tautan ulasan per pesanan: /ulasan/<token acak>. Token dibuat sekali lalu dipakai
// ulang (email ajakan ulas & tombol WA admin). Server-only.
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");

/** Status pesanan yang boleh diulas (paket sudah dikirim). */
export const REVIEWABLE_STATUSES = ["SHIPPED", "DONE"];

export const reviewUrl = (token: string) => `${SITE}/ulasan/${token}`;

/** Token ulasan pesanan — dibuat bila belum ada. */
export async function ensureReviewToken(order: { id: string; reviewToken: string | null }): Promise<string> {
  if (order.reviewToken) return order.reviewToken;
  const token = randomBytes(16).toString("hex");
  await db.order.update({ where: { id: order.id }, data: { reviewToken: token } });
  return token;
}

/** Pesanan + produk yang dibeli (unik) untuk halaman/submit ulasan. Null bila token tak valid. */
export async function findReviewableOrder(token: string) {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const order = await db.order.findFirst({
    where: { reviewToken: token },
    select: { id: true, status: true, address: true, items: { select: { variantId: true } } },
  });
  if (!order) return null;
  const variants = await db.variant.findMany({
    where: { id: { in: order.items.map((i) => i.variantId) } },
    select: { product: { select: { id: true, slug: true, name: true, coverImage: true } } },
  });
  const products = [...new Map(variants.map((v) => [v.product.id, v.product])).values()];
  return { ...order, products };
}
