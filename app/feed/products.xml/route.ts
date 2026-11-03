import { buildFallback } from "@/lib/build-fallback";
import { getPromoHiddenIds } from "@/lib/promo-page/promo";
import { feedItems, feedResponse, findFeedProducts, type FeedProduct } from "@/lib/feed";

// Feed produk (Google RSS 2.0 + namespace g:) — dipakai Meta Catalog (Data feed)
// & Google Merchant Center sekaligus. Per-VARIAN, dikelompokkan item_group_id (lib/feed.ts).
// URL: /feed/products.xml — regenerasi tiap jam.
export const revalidate = 3600;

export async function GET() {
  let products: FeedProduct[] = [];
  try {
    products = await fetchProducts();
  } catch (e) {
    // Saat regenerasi: LEMPAR → feed terakhir yang lengkap tetap disajikan. Feed kosong yang ter-cache 1 jam
    // bisa dibaca Google Merchant / Meta Catalog sebagai "semua produk dihapus" (iklan berhenti).
    products = buildFallback(e, []);
  }
  return feedResponse("SNAPFIT", "Katalog produk SNAPFIT", feedItems(products));
}

async function fetchProducts() {
  // Produk "hanya di halaman promo" tak diiklankan di Google/Meta Shopping (punya feed sendiri: /feed/buy1get1.xml).
  const hidden = [...(await getPromoHiddenIds())];
  return findFeedProducts({ where: { archived: false, id: { notIn: hidden } }, orderBy: { createdAt: "desc" } });
}
