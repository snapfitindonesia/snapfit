// Event e-commerce → GA4 (gtag), Meta Pixel (browser) + Conversions API (server).
// Aman dipanggil sebelum script analitik termuat: gtag/fbq berupa stub antrean.

type Item = {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

type Pii = { email?: string; phone?: string };

// Kirim event ke Facebook Pixel (browser) + Conversions API (server) dengan
// event_id yang SAMA → Meta dedup otomatis. Aman bila Pixel/CAPI tak aktif.
function fbTrack(event: string, params?: Record<string, unknown>, pii?: Pii, fixedEventId?: string) {
  if (typeof window === "undefined") return;
  const eventId =
    fixedEventId ??
    window.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.fbq?.("track", event, params, { eventID: eventId });
  try {
    fetch("/api/fb-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true, // tetap terkirim walau halaman berpindah (mis. Purchase)
      body: JSON.stringify({
        eventName: event,
        eventId,
        eventSourceUrl: window.location.href,
        customData: params,
        email: pii?.email,
        phone: pii?.phone,
      }),
    }).catch(() => {});
  } catch {
    // abaikan
  }
}

// Kirim event e-commerce ke GA4 (aman bila gtag tak dimuat).
function gaTrack(event: string, params: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}

export function trackViewItem(item: Item) {
  fbTrack("ViewContent", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value: item.price,
    currency: "IDR",
  });
  gaTrack("view_item", { currency: "IDR", value: item.price, items: [item] });
}

export function trackAddToCart(item: Item) {
  const value = item.price * (item.quantity ?? 1);
  fbTrack("AddToCart", {
    content_ids: [item.item_id],
    content_name: item.item_name,
    content_type: "product",
    value,
    currency: "IDR",
  });
  gaTrack("add_to_cart", { currency: "IDR", value, items: [item] });
}

export function trackBeginCheckout(value: number, items: Item[], pii?: Pii) {
  fbTrack("InitiateCheckout", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: "IDR",
  }, pii);
  gaTrack("begin_checkout", { currency: "IDR", value, items });
}

/** Klik tombol WhatsApp — `source`: floating / pdp / pdp-stok-habis. */
export function trackContact(source: string, productName?: string) {
  fbTrack("Contact", { content_name: productName ?? source, content_category: source });
  gaTrack("contact_whatsapp", { source, item_name: productName });
}

export function trackPurchase(transactionId: string, value: number, items: Item[], pii?: Pii) {
  fbTrack("Purchase", {
    content_ids: items.map((i) => i.item_id),
    content_type: "product",
    num_items: items.reduce((n, i) => n + (i.quantity ?? 1), 0),
    value,
    currency: "IDR",
  }, pii, `purchase_${transactionId}`); // ID tetap per pesanan → Meta buang duplikat (mis. buka ulang dari email/perangkat lain)
  gaTrack("purchase", { transaction_id: transactionId, currency: "IDR", value, items });
}
