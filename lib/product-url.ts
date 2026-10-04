// URL produk: /produk/<teks-dari-judul>-<shortId>. ID angka TETAP (tak pernah berubah); teks mengikuti
// judul terbaru. URL dengan teks lama / slug lama (sebelum Okt 2026) dialihkan 301 ke URL kanonik
// (app/(shop)/produk/[slug]/page.tsx). Murni (tanpa DB) → aman untuk client & server.

export type ProductUrlLike = { slug: string; shortId: number | null };

/** Segmen URL kanonik. shortId kosong (seharusnya tak terjadi) → slug saja (dialihkan via legacy). */
export function productSegment(p: ProductUrlLike): string {
  return p.shortId ? `${p.slug}-${p.shortId}` : p.slug;
}

export function productPath(p: ProductUrlLike): string {
  return `/produk/${productSegment(p)}`;
}

/** "case-iphone-18-1042" → { text: "case-iphone-18", id: 1042 }; tanpa angka di akhir → id null. */
export function parseProductSegment(seg: string): { text: string; id: number | null } {
  const m = seg.match(/^(.*)-(\d{1,9})$/);
  return m ? { text: m[1], id: Number(m[2]) } : { text: seg, id: null };
}
