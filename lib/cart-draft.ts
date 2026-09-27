// Helper server untuk pengingat keranjang ditinggal (CheckoutDraft).
// BUKAN server action — tidak bisa dipanggil dari browser.
import { db } from "@/lib/db";
import { activeDiscountPercent, applyDiscount } from "@/lib/format";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { normalizePhoneID } from "@/lib/wa";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");

export type DraftLine = { variantId: string; qty: number };

export type DraftItem = {
  variantId: string;
  productSlug: string;
  name: string;
  price: number; // setelah diskon aktif
  image: string;
  qty: number; // dibatasi stok
};

export const normalizeEmail = (e?: string | null) => (e ?? "").trim().toLowerCase() || null;
export const normalizePhone = (p?: string | null) => {
  const n = normalizePhoneID(p);
  return n.length >= 10 ? n : null;
};

/** Tautan email/WA untuk memulihkan keranjang. */
export const restoreUrl = (token: string) => `${SITE}/keranjang?pulih=${token}`;

/**
 * Baris keranjang → item yang MASIH bisa dibeli (produk tidak diarsipkan,
 * harga bukan dummy, stok > 0), dengan harga & foto terkini dari DB.
 */
export async function sellableDraftItems(lines: DraftLine[]): Promise<DraftItem[]> {
  if (!lines.length) return [];
  const variants = await db.variant.findMany({
    where: { id: { in: lines.map((l) => l.variantId) } },
    include: {
      product: { select: { slug: true, name: true, coverImage: true, archived: true } },
      discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
    },
  });
  const out: DraftItem[] = [];
  for (const line of lines) {
    const v = variants.find((x) => x.id === line.variantId);
    if (!v || v.product.archived || isPlaceholderPrice(v.price) || v.stock <= 0) continue;
    out.push({
      variantId: v.id,
      productSlug: v.product.slug,
      name: `${v.product.name} — ${v.name}`,
      price: applyDiscount(v.price, activeDiscountPercent(v.discounts)),
      image: v.image || v.product.coverImage,
      qty: Math.min(Math.max(1, line.qty), v.stock),
    });
  }
  return out;
}

/** Pesanan dibuat → tandai draf dengan kontak yang sama sebagai "jadi pesanan". */
export async function markDraftsConverted(email?: string | null, phone?: string | null): Promise<void> {
  const e = normalizeEmail(email);
  const p = normalizePhone(phone);
  const or = [...(e ? [{ email: e }] : []), ...(p ? [{ phone: p }] : [])];
  if (!or.length) return;
  await db.checkoutDraft.updateMany({
    where: { convertedAt: null, OR: or },
    data: { convertedAt: new Date() },
  });
}
