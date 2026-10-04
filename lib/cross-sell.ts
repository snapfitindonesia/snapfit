// "Lengkapi dengan" di PDP: case ↔ tempered glass / pelindung lensa untuk TIPE HP
// yang sama. Dihitung di server saat ISR PDP (cache 5 mnt) — bukan per pengunjung.
import { db } from "@/lib/db";
import { productSegment } from "@/lib/product-url";
import { activeDiscountPercent, applyDiscount } from "@/lib/format";
import { isPlaceholderPrice } from "@/lib/price-guard";
import { COMPANION_KINDS, productKind, typeKey, type ProductKind } from "@/lib/product-kind";

/** Ringkasan per tipe HP: varian pertama (untuk tambah/tautan), harga termurah, jumlah varian. */
export type CompanionOption = { key: string; id: string; name: string; price: number; image: string; count: number };
export type Companion = {
  productId: string;
  slug: string;
  name: string;
  kind: ProductKind;
  options: CompanionOption[]; // 1 per tipe HP yang cocok (payload kecil)
};

// Saring kasar di DB (nama), klasifikasi pasti di JS (productKind).
const NAME_HINTS: Record<ProductKind, string[]> = {
  case: ["case", "casing"],
  glass: ["tempered", "screen protector", "hydrogel"],
  lens: ["lens"],
  other: [],
};

const MAX_PRODUCTS = 8;

export async function getCompanions(product: {
  id: string;
  name: string;
  variants: { type: string }[];
}): Promise<Companion[]> {
  const targets = COMPANION_KINDS[productKind(product.name)];
  const keys = new Set(product.variants.map((v) => typeKey(v.type)).filter((k): k is string => !!k));
  if (!targets.length || !keys.size) return [];

  const candidates = await db.product.findMany({
    where: {
      archived: false,
      id: { not: product.id },
      OR: targets.flatMap((k) => NAME_HINTS[k]).map((h) => ({ name: { contains: h, mode: "insensitive" as const } })),
    },
    select: {
      id: true,
      slug: true,
      shortId: true,
      name: true,
      variants: {
        where: { stock: { gt: 0 } },
        select: {
          id: true,
          name: true,
          type: true,
          price: true,
          image: true,
          discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
        },
      },
    },
  });

  const out: Companion[] = [];
  for (const c of candidates) {
    const kind = productKind(c.name);
    if (!targets.includes(kind)) continue;
    const byKey = new Map<string, CompanionOption>();
    for (const v of c.variants) {
      const key = typeKey(v.type);
      if (!key || !keys.has(key) || isPlaceholderPrice(v.price)) continue;
      const price = applyDiscount(v.price, activeDiscountPercent(v.discounts));
      const cur = byKey.get(key);
      if (!cur) byKey.set(key, { key, id: v.id, name: v.name, price, image: v.image, count: 1 });
      else {
        cur.count++;
        cur.price = Math.min(cur.price, price);
      }
    }
    if (byKey.size) out.push({ productId: c.id, slug: productSegment(c), name: c.name, kind, options: [...byKey.values()] }); // slug = segmen URL
  }
  // Prioritas jenis (glass sebelum lens), lalu yang paling banyak tipe cocok.
  out.sort((a, b) => targets.indexOf(a.kind) - targets.indexOf(b.kind) || b.options.length - a.options.length);
  return out.slice(0, MAX_PRODUCTS);
}
