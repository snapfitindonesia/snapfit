// Jalur pembayaran Midtrans (Snap + webhook) ke database sementara. API Midtrans DITIRUKAN (fetch palsu) —
// tak ada permintaan ke Midtrans sungguhan; key di sini palsu (awalan SB- = sandbox).
import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/actions/order";
import { POST as webhook } from "@/app/api/midtrans/webhook/route";
import { PENDING_EXPIRE_DAYS } from "@/lib/validations/admin";
import { paymentReminderEmail } from "@/lib/email";
import { ADDRESS, flushAfter, resetDb, seedStore, setTestUser, stockOf } from "../support/fixtures";

const KEY = "SB-Mid-server-UJI";
let snapCalls: { url: string; auth: string | null; body: Record<string, unknown> }[] = [];
let snapFails = false;

beforeEach(async () => {
  await resetDb();
  await seedStore();
  setTestUser(null);
  vi.stubEnv("PAYMENT_MODE", "midtrans");
  vi.stubEnv("MIDTRANS_SERVER_KEY", KEY);
  snapCalls = [];
  snapFails = false;
  const realFetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    if (!url.includes("midtrans.com")) return realFetch(input, init);
    snapCalls.push({ url, auth: new Headers(init?.headers).get("authorization"), body: JSON.parse(String(init?.body)) });
    if (snapFails) return new Response('{"error_messages":["uji gagal"]}', { status: 500 });
    const n = snapCalls.length;
    return Response.json({ token: `tok-${n}`, redirect_url: `https://app.sandbox.midtrans.com/snap/v4/redirection/tok-${n}` });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function order(items: { variantId: string; qty: number }[]) {
  const r = await createOrder({ address: ADDRESS, items } as Parameters<typeof createOrder>[0]);
  await flushAfter();
  return r;
}

/** Notifikasi webhook bertanda tangan seperti dari Midtrans. */
function notification(orderId: string, transaction_status: string, gross: number, key = KEY) {
  const status_code = transaction_status === "settlement" ? "200" : "202";
  const gross_amount = `${gross}.00`;
  const signature_key = crypto.createHash("sha512").update(orderId + status_code + gross_amount + key).digest("hex");
  return new Request("http://localhost/api/midtrans/webhook", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, status_code, gross_amount, signature_key, transaction_status }),
  });
}

describe("checkout mode Midtrans", () => {
  it("token Snap dibuat ke SANDBOX (dari awalan key) + link bayar disimpan di pesanan", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    if ("error" in r) throw new Error(r.error);
    expect(r.manual).toBe(false);
    expect(r.snapToken).toBe("tok-1");
    expect(snapCalls).toHaveLength(1);
    expect(snapCalls[0]!.url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
    expect(snapCalls[0]!.auth).toBe(`Basic ${Buffer.from(`${KEY}:`).toString("base64")}`);

    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.status).toBe("PENDING");
    expect(o.snapToken).toBe("tok-1");
    expect(o.snapUrl).toContain("/snap/v4/redirection/tok-1");
  });

  it("isi permintaan Snap: total = jumlah item, batas bayar = batas batal otomatis, kembali ke halaman status", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 2 }]);
    if ("error" in r) throw new Error(r.error);
    const body = snapCalls[0]!.body as {
      transaction_details: { order_id: string; gross_amount: number };
      item_details: { price: number; quantity: number }[];
      expiry: { start_time: string; unit: string; duration: number };
      callbacks: { finish: string };
      gopay: { enable_callback: boolean; callback_url: string };
    };
    expect(body.transaction_details).toEqual({ order_id: r.midtransOrderId, gross_amount: r.total });
    expect(body.item_details.reduce((s, i) => s + i.price * i.quantity, 0)).toBe(r.total); // syarat Midtrans
    expect(body.expiry.unit).toBe("hours");
    expect(body.expiry.duration).toBe(PENDING_EXPIRE_DAYS * 24);
    expect(body.expiry.start_time).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \+0700$/);
    const finish = `https://www.snapfit.id/checkout/sukses?order=${encodeURIComponent(r.midtransOrderId)}`;
    expect(body.callbacks.finish).toBe(finish);
    expect(body.gopay).toEqual({ enable_callback: true, callback_url: finish });
  });

  it("Midtrans gagal → pesanan langsung DIBATALKAN (bukan yatim) & pembeli dapat pesan jelas", async () => {
    snapFails = true;
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    expect(r).toEqual({ error: expect.stringContaining("Pembayaran online sedang bermasalah") });
    const all = await db.order.findMany();
    expect(all).toHaveLength(1);
    expect(all[0]!.status).toBe("CANCELLED");
    expect(all[0]!.snapToken).toBeNull();
  });

  it("key production (awalan Mid-) → URL Snap production", async () => {
    vi.stubEnv("MIDTRANS_SERVER_KEY", "Mid-server-UJI");
    await order([{ variantId: "v-hitam", qty: 1 }]);
    expect(snapCalls[0]!.url).toBe("https://app.midtrans.com/snap/v1/transactions");
  });
});

describe("webhook Midtrans", () => {
  it("settlement → LUNAS & stok berkurang; notifikasi ulang tak mengurangi stok lagi", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 2 }]);
    if ("error" in r) throw new Error(r.error);
    const before = await stockOf("v-hitam");
    expect((await webhook(notification(r.midtransOrderId, "settlement", r.total))).status).toBe(200);
    await webhook(notification(r.midtransOrderId, "settlement", r.total)); // Midtrans bisa kirim ulang
    await flushAfter();
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.status).toBe("PAID");
    expect(await stockOf("v-hitam")).toBe(before - 2);
  });

  it("tanda tangan salah → ditolak 403, pesanan tetap menunggu bayar", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    if ("error" in r) throw new Error(r.error);
    const res = await webhook(notification(r.midtransOrderId, "settlement", r.total, "SB-Mid-server-PALSU"));
    expect(res.status).toBe(403);
    expect((await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } })).status).toBe("PENDING");
  });

  it("expire → DIBATALKAN, stok tidak berubah", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    if ("error" in r) throw new Error(r.error);
    const before = await stockOf("v-hitam");
    await webhook(notification(r.midtransOrderId, "expire", r.total));
    expect((await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } })).status).toBe("CANCELLED");
    expect(await stockOf("v-hitam")).toBe(before);
  });

  it("pending (VA dibuat) → tetap menunggu bayar", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    if ("error" in r) throw new Error(r.error);
    await webhook(notification(r.midtransOrderId, "pending", r.total));
    expect((await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } })).status).toBe("PENDING");
  });
});

describe("email pengingat bayar", () => {
  it("mode Midtrans: tombol Bayar Sekarang ke halaman status, tanpa rekening transfer", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    if ("error" in r) throw new Error(r.error);
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    const { html } = paymentReminderEmail(o, [], null);
    expect(html).toContain("Bayar Sekarang");
    expect(html).toContain(`/checkout/sukses?order=${encodeURIComponent(r.midtransOrderId)}`);
    expect(html).not.toContain("Transfer ke rekening");
  });
});
