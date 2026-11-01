// Promo Buy 1 Get 1 di pesanan nyata (server = sumber kebenaran harga) ke database sementara.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/actions/order";
import { getCartPrices } from "@/lib/actions/cart";
import { quoteShipping } from "@/lib/actions/shipping";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_KEY } from "@/lib/promo-page/config";
import { ADDRESS, flushAfter, resetDb, seedStore } from "../support/fixtures";

let productId = "";

/** Aktifkan promo untuk produk tertentu (seperti simpan di Admin → Halaman Buy 1 Get 1). */
async function setPromo(ids: string[], promoActive = true) {
  const value = { ...DEFAULT_PROMO_PAGE, products: { ...DEFAULT_PROMO_PAGE.products, productIds: ids, promoActive } };
  await db.siteSetting.upsert({ where: { key: PROMO_PAGE_KEY }, create: { key: PROMO_PAGE_KEY, value }, update: { value } });
}

async function order(items: { variantId: string; qty: number }[], extra: Record<string, unknown> = {}) {
  const r = await createOrder({ address: ADDRESS, items, ...extra } as Parameters<typeof createOrder>[0]);
  await flushAfter();
  if ("error" in r) throw new Error(`createOrder gagal: ${r.error}`);
  return db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
}

beforeEach(async () => {
  await resetDb();
  productId = (await seedStore()).id;
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("promo Buy 1 Get 1 di pesanan", () => {
  it("2 varian peserta: yang lebih murah gratis, total & potongan tersimpan", async () => {
    await setPromo([productId]);
    const o = await order([{ variantId: "v-hitam", qty: 1 }, { variantId: "v-biru", qty: 1 }]);
    expect(o.subtotal).toBe(139_000);
    expect(o.promoDiscount).toBe(50_000);
    expect(o.shippingCost).toBe(28_000); // 1.700 g → 2 kg
    expect(o.total).toBe(139_000 - 50_000 + 28_000);
  });

  it("voucher min. belanja dihitung dari subtotal SETELAH promo", async () => {
    await setPromo([productId]);
    // 139rb − 50rb = 89rb < min. 100rb → SNAP10K tak berlaku (tanpa promo: berlaku).
    const o = await order([{ variantId: "v-hitam", qty: 1 }, { variantId: "v-biru", qty: 1 }], { voucherCodes: ["SNAP10K"] });
    expect(o.discount).toBe(0);
    await setPromo([]);
    const o2 = await order([{ variantId: "v-hitam", qty: 1 }, { variantId: "v-biru", qty: 1 }], { voucherCodes: ["SNAP10K"] });
    expect(o2.promoDiscount).toBe(0);
    expect(o2.discount).toBe(10_000);
  });

  it("promo dimatikan / produk bukan peserta / cuma 1 unit → tanpa potongan", async () => {
    await setPromo([productId], false);
    expect((await order([{ variantId: "v-hitam", qty: 2 }])).promoDiscount).toBe(0);
    await setPromo(["produk-lain"]);
    expect((await order([{ variantId: "v-hitam", qty: 2 }])).promoDiscount).toBe(0);
    await setPromo([productId]);
    expect((await order([{ variantId: "v-hitam", qty: 1 }])).promoDiscount).toBe(0);
  });

  it("Midtrans: jumlah item_details (termasuk baris promo) = total yang ditagih", async () => {
    await setPromo([productId]);
    vi.stubEnv("PAYMENT_MODE", "midtrans");
    vi.stubEnv("MIDTRANS_SERVER_KEY", "SB-Mid-server-UJI");
    let body: { transaction_details: { gross_amount: number }; item_details: { id: string; price: number; quantity: number }[] } | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ token: "tok", redirect_url: "https://app.sandbox.midtrans.com/snap/v4/redirection/tok" });
    });
    const o = await order([{ variantId: "v-hitam", qty: 2 }]);
    expect(o.promoDiscount).toBe(89_000);
    expect(body!.item_details.find((i) => i.id === "b1g1")?.price).toBe(-89_000);
    expect(body!.item_details.reduce((s, i) => s + i.price * i.quantity, 0)).toBe(o.total);
    expect(body!.transaction_details.gross_amount).toBe(o.total);
  });

  it("keranjang tahu varian peserta (getCartPrices) & perkiraan ongkir memakai subtotal setelah promo", async () => {
    await setPromo([productId]);
    const prices = await getCartPrices(["v-hitam", "v-biru"]);
    expect(prices.every((p) => p.b1g1)).toBe(true);
    await setPromo([]);
    expect((await getCartPrices(["v-hitam"]))[0]!.b1g1).toBe(false);
    // Ongkir zona tak bergantung subtotal di fixture → cukup pastikan perkiraan = ongkir pesanan.
    await setPromo([productId]);
    const q = await quoteShipping({ provinceCode: "34", items: [{ variantId: "v-hitam", qty: 1 }, { variantId: "v-biru", qty: 1 }] });
    const o = await order([{ variantId: "v-hitam", qty: 1 }, { variantId: "v-biru", qty: 1 }]);
    expect(q?.cost).toBe(o.shippingCost);
  });
});
