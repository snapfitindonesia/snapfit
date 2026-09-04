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
  }
}

function push(payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null }); // bersihkan objek sebelumnya (GA4)
  window.dataLayer.push(payload);
}

export function trackViewItem(item: Item) {
  push({
    event: "view_item",
    ecommerce: { currency: "IDR", value: item.price, items: [item] },
  });
}

export function trackAddToCart(item: Item) {
  push({
    event: "add_to_cart",
    ecommerce: {
      currency: "IDR",
      value: item.price * (item.quantity ?? 1),
      items: [item],
    },
  });
}

export function trackBeginCheckout(value: number, items: Item[]) {
  push({
    event: "begin_checkout",
    ecommerce: { currency: "IDR", value, items },
  });
}

export function trackPurchase(transactionId: string, value: number, items: Item[]) {
  push({
    event: "purchase",
    ecommerce: { transaction_id: transactionId, currency: "IDR", value, items },
  });
}
