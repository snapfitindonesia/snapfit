import { buildFallback } from "@/lib/build-fallback";
import { getPromoPageConfig } from "@/lib/promo-page/settings";
import { inferDevices } from "@/lib/promo-page/devices";
import { esc, feedItems, feedResponse, findFeedProducts, type FeedProduct } from "@/lib/feed";

// Feed KHUSUS produk Buy 1 Get 1 (Admin → Halaman Buy 1 Get 1) untuk Meta Catalog / iklan katalog Facebook.
// TIDAK dipakai Google Merchant (produk promo sengaja tak masuk Google Shopping & tak diindeks).
// Format sama dgn /feed/products.xml + label untuk set produk di Meta:
//   custom_label_0 = "buy1get1", custom_label_1 = merek perangkat (Samsung/Apple/…),
//   custom_label_2 = model (Galaxy Z Fold 4, iPhone 15, …), product_type = "Merek > Lini > Model".
// URL: /feed/buy1get1.xml — regenerasi tiap jam.
export const revalidate = 3600;

export async function GET() {
  let products: FeedProduct[] = [];
  try {
    const ids = (await getPromoPageConfig()).products.productIds;
    products = ids.length ? await findFeedProducts({ where: { archived: false, id: { in: ids } } }) : [];
    const order = new Map(ids.map((id, i) => [id, i]));
    products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  } catch (e) {
    // Gagal saat regenerasi → feed terakhir tetap disajikan (feed kosong = Meta menganggap produk dihapus).
    products = buildFallback(e, []);
  }
  const items = feedItems(products, (p) => {
    const d = inferDevices(p.name)[0];
    return {
      productType: d ? [d.brand.name, d.line.name, d.model?.name].filter(Boolean).join(" > ") : "Buy 1 Get 1",
      xml:
        `<g:custom_label_0>buy1get1</g:custom_label_0>` +
        (d ? `<g:custom_label_1>${esc(d.brand.name)}</g:custom_label_1>` : "") +
        (d?.model ? `<g:custom_label_2>${esc(d.model.name)}</g:custom_label_2>` : ""),
    };
  });
  return feedResponse("SNAPFIT Buy 1 Get 1", "Katalog produk promo Buy 1 Get 1 SNAPFIT", items);
}
