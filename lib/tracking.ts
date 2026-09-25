// Push event e-commerce ke dataLayer (dikonsumsi GTM → Pixel/GA4, docs/08).
// Aman dipanggil walau GTM belum dimuat: dataLayer hanya array biasa.

type Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    fbq?: (...args: unknown[]) => void;
  }
}

function push(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // bersihkan objek sebelumnya (GA4)
  window.dataLayer.push(payload);
}

// Kirim event standar ke Facebook Pixel (aman bila Pixel tak dimuat).
function fbTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.fbq?.("track", event, params);
}

export function trackViewItem(item: Item) {
  push({
    event: "view_item",
    ecommerce: { currency: "IDR", value: item.price, items: [item] },
  });
  fbTrack("ViewContent", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value: item.price,
    currency: "IDR",
  });
}

export function trackAddToCart(item: Item) {
  const value = item.price * (item.quantity ?? 1);
  push({
    event: "add_to_cart",
    ecommerce: { currency: "IDR", value, items: [item] },
  });
  fbTrack("AddToCart", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value,
    currency: "IDR",
  });
}

export function trackBeginCheckout(value: number, items: Item[]) {
  push({
    event: "begin_checkout",
    ecommerce: { currency: "IDR", value, items },
  });
  fbTrack("InitiateCheckout", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: "IDR",
  });
}

export function trackPurchase(transactionId: string, value: number, items: Item[]) {
  push({
    event: "purchase",
    ecommerce: { transaction_id: transactionId, currency: "IDR", value, items },
  });
  fbTrack("Purchase", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: "IDR",
  });
}
