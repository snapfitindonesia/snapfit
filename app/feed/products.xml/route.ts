import { db } from "@/lib/db";
import { applyDiscount } from "@/lib/format";
import { isPlaceholderPrice } from "@/lib/price-guard";

// Feed produk (Google RSS 2.0 + namespace g:) — dipakai Meta Catalog (Data feed)
// & Google Merchant Center sekaligus. Per-VARIAN, dikelompokkan item_group_id.
// URL: /feed/products.xml — regenerasi tiap jam.
export const revalidate = 3600;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id").replace(/\/$/, "");

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function activePct(
  discounts: { percent: number; active: boolean; startAt: Date | null; endAt: Date | null }[],
): number {
  const now = Date.now();
  const p = discounts
    .filter((d) => d.active && (!d.startAt || d.startAt.getTime() <= now) && (!d.endAt || d.endAt.getTime() >= now))
    .map((d) => d.percent);
  return p.length ? Math.max(...p) : 0;
}

export async function GET() {
  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  try {
    products = await fetchProducts();
  } catch {
    products = [];
  }

  const items: string[] = [];
  for (const p of products) {
    const gallery = Array.isArray(p.images) ? (p.images as string[]) : [];
    const link = `${SITE}/produk/${p.slug}`;
    const brand = p.brand || "SNAPFIT";
    const desc = (p.description || p.name).slice(0, 4000);
    for (const v of p.variants) {
      const img = v.image || p.coverImage;
      if (!img || isPlaceholderPrice(v.price)) continue; // harga placeholder → jangan diiklankan
      const pct = activePct(v.discounts);
      const finalP = applyDiscount(v.price, pct);
      const label = [v.color, v.type].filter(Boolean).join(" ").trim();
      const title = (label ? `${p.name} - ${label}` : p.name).slice(0, 150);
      const avail = v.stock > 0 ? "in_stock" : "out_of_stock";
      // Gambar tambahan: COVER dulu (disimpan terpisah dari galeri), lalu galeri.
      // Gambar utama tetap foto varian (warna sesuai; cover sering berisi teks promo).
      const extraImgs = [...new Set([p.coverImage, ...gallery])]
        .filter((u) => u && u !== img)
        .slice(0, 10)
        .map((u) => `<g:additional_image_link>${esc(u)}</g:additional_image_link>`)
        .join("");
      items.push(
        `<item>` +
          `<g:id>${esc(v.id)}</g:id>` +
          `<g:item_group_id>${esc(p.id)}</g:item_group_id>` +
          `<title>${esc(title)}</title>` +
          `<description>${esc(desc)}</description>` +
          `<link>${esc(link)}</link>` +
          `<g:image_link>${esc(img)}</g:image_link>` +
          extraImgs +
          `<g:availability>${avail}</g:availability>` +
          `<g:condition>new</g:condition>` +
          `<g:price>${v.price} IDR</g:price>` +
          (pct > 0 ? `<g:sale_price>${finalP} IDR</g:sale_price>` : "") +
          `<g:brand>${esc(brand)}</g:brand>` +
          (v.sku ? `<g:mpn>${esc(v.sku)}</g:mpn>` : "") +
          `<g:identifier_exists>${v.sku ? "yes" : "no"}</g:identifier_exists>` +
          (p.category?.name ? `<g:product_type>${esc(p.category.name)}</g:product_type>` : "") +
          `</item>`,
      );
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">` +
    `<channel>` +
    `<title>SNAPFIT</title>` +
    `<link>${SITE}</link>` +
    `<description>Katalog produk SNAPFIT</description>` +
    items.join("") +
    `</channel></rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

function fetchProducts() {
  return db.product.findMany({
    where: { archived: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, slug: true, name: true, description: true, brand: true, coverImage: true, images: true,
      category: { select: { name: true } },
      variants: {
        select: {
          id: true, color: true, type: true, price: true, stock: true, image: true, sku: true,
          discounts: { select: { percent: true, active: true, startAt: true, endAt: true } },
        },
      },
    },
  });
}
