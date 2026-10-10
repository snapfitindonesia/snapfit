// Alur pesanan & stok ke database nyata (Postgres sementara di memori — lihat tests/support).
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { provinceName } from "@/lib/wilayah";
import { createOrder, handlePaidOrder, markOrderPaid } from "@/lib/actions/order";
import { updateOrder } from "@/lib/actions/admin";
import { grantCoins } from "@/lib/coins";
import { ADDRESS, flushAfter, resetDb, seedStore, setTestUser, stockOf } from "../support/fixtures";

beforeEach(async () => {
  await resetDb();
  await seedStore();
  setTestUser(null);
});

/** Buat pesanan & pastikan berhasil. */
async function order(items: { variantId: string; qty: number }[], extra: Record<string, unknown> = {}) {
  const r = await createOrder({ address: ADDRESS, items, ...extra } as Parameters<typeof createOrder>[0]);
  await flushAfter();
  if ("error" in r) throw new Error(`createOrder gagal: ${r.error}`);
  return r;
}

describe("buat pesanan (checkout)", () => {
  it("menyimpan pesanan Menunggu Bayar dengan total = barang + ongkir provinsi", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 2 }]);
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId }, include: { items: true } });
    expect(o.status).toBe("PENDING");
    expect(o.subtotal).toBe(178_000);
    expect(o.shippingCost).toBe(20_000); // 400 g → 1 kg → tarif dasar DIY
    expect(o.total).toBe(198_000);
    expect(o.items).toEqual([expect.objectContaining({ variantId: "v-hitam", qty: 2, price: 89_000 })]);
    expect(await stockOf("v-hitam")).toBe(4); // stok baru berkurang saat LUNAS
  });

  it("ongkir per kg: 1 kg + 2 kg tambahan", async () => {
    const r = await order([{ variantId: "v-biru", qty: 2 }]); // 3000 g → 3 kg
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.shippingCost).toBe(20_000 + 2 * 8_000);
  });

  it("voucher potongan dihitung ulang di server", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 2 }], { voucherCodes: ["snap10k"] });
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.discount).toBe(10_000);
    expect(o.voucherCodes).toBe("SNAP10K");
    expect(o.total).toBe(188_000);
  });

  it("voucher tak memenuhi minimum belanja diabaikan (bukan error)", async () => {
    const r = await order([{ variantId: "v-biru", qty: 1 }], { voucherCodes: ["SNAP10K"] });
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.discount).toBe(0);
  });

  it("varian sama di 2 baris (3 + 2) untuk stok 4 → ditolak", async () => {
    const r = await createOrder({ address: ADDRESS, items: [{ variantId: "v-hitam", qty: 3 }, { variantId: "v-hitam", qty: 2 }] });
    expect(r).toEqual({ error: expect.stringMatching(/tidak cukup/) });
    expect(await db.order.count()).toBe(0);
  });

  it("varian berharga placeholder tak bisa dibeli", async () => {
    const r = await createOrder({ address: ADDRESS, items: [{ variantId: "v-dummy", qty: 1 }] });
    expect(r).toEqual({ error: expect.stringMatching(/tidak tersedia/) });
  });

  it("provinsi tanpa kurir → ditolak dengan pesan jelas", async () => {
    const papua = { ...ADDRESS, provinceCode: "91", province: provinceName("91")!, regencyCode: "91.01", city: "Kab. Uji", districtCode: "91.01.01", district: "Uji" };
    const r = await createOrder({ address: papua, items: [{ variantId: "v-hitam", qty: 1 }] });
    expect(r).toMatchObject({ error: expect.stringMatching(/belum ada kurir/) });
  });

  it("koin member: maks. 30% subtotal dipakai & saldo berkurang", async () => {
    setTestUser({ id: "user-1" });
    await grantCoins("user-1", 100_000, "ADJUST", "uji-saldo");
    const r = await order([{ variantId: "v-hitam", qty: 2 }], { useCoins: true });
    const o = await db.order.findUniqueOrThrow({ where: { midtransOrderId: r.midtransOrderId } });
    expect(o.coinsUsed).toBe(Math.floor(178_000 * 0.3)); // 53.400
    expect(o.total).toBe(198_000 - 53_400);
    const spend = await db.coinEntry.findMany({ where: { userId: "user-1", kind: "SPEND" } });
    expect(spend.reduce((n, e) => n + e.amount, 0)).toBe(-53_400);
  });
});

describe("konfirmasi bayar (lunas)", () => {
  it("stok berkurang SEKALI walau dipanggil berulang/bersamaan (retry webhook + admin)", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 3 }]);
    const res = await Promise.all([1, 2, 3].map(() => handlePaidOrder(r.midtransOrderId, "uji")));
    await flushAfter();
    expect(res.filter((x) => !x.alreadyProcessed)).toHaveLength(1);
    expect(await stockOf("v-hitam")).toBe(1);
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("PAID");
  });

  it("tombol admin Konfirmasi Bayar menandai lunas", async () => {
    const r = await order([{ variantId: "v-biru", qty: 1 }]);
    expect(await markOrderPaid(r.orderId)).toEqual({ ok: true });
    await flushAfter();
    expect(await stockOf("v-biru")).toBe(9);
  });

  it("pesanan yang sudah dibatalkan TIDAK bisa jadi lunas", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    expect((await updateOrder({ id: r.orderId, status: "CANCELLED", trackingNo: "" })).ok).toBe(true);
    const res = await handlePaidOrder(r.midtransOrderId, "uji");
    expect(res).toMatchObject({ cancelled: true, status: "CANCELLED" });
    expect(await markOrderPaid(r.orderId)).toMatchObject({ ok: false });
    expect(await stockOf("v-hitam")).toBe(4);
  });
});

describe("ubah status manual (admin)", () => {
  it("Menunggu Bayar → Lunas lewat dropdown ditolak", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    const res = await updateOrder({ id: r.orderId, status: "PAID", trackingNo: "" });
    expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/Konfirmasi Bayar/) });
    expect((await db.order.findUniqueOrThrow({ where: { id: r.orderId } })).status).toBe("PENDING");
  });

  it("batal setelah lunas (belum dikirim) → stok kembali", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 2 }]);
    await handlePaidOrder(r.midtransOrderId, "uji");
    await flushAfter();
    expect(await stockOf("v-hitam")).toBe(2);
    expect((await updateOrder({ id: r.orderId, status: "CANCELLED", trackingNo: "" })).ok).toBe(true);
    expect(await stockOf("v-hitam")).toBe(4);
  });

  it("batal setelah dikirim → stok TIDAK dikembalikan otomatis", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    await handlePaidOrder(r.midtransOrderId, "uji");
    await updateOrder({ id: r.orderId, status: "SHIPPED", trackingNo: "RESI123" });
    await updateOrder({ id: r.orderId, status: "CANCELLED", trackingNo: "RESI123" });
    await flushAfter();
    expect(await stockOf("v-hitam")).toBe(3);
  });

  it("pesanan dibatalkan bersifat final", async () => {
    const r = await order([{ variantId: "v-hitam", qty: 1 }]);
    await updateOrder({ id: r.orderId, status: "CANCELLED", trackingNo: "" });
    expect((await updateOrder({ id: r.orderId, status: "PROCESSING", trackingNo: "" })).ok).toBe(false);
  });

  it("batal mengembalikan koin member yang terpakai", async () => {
    setTestUser({ id: "user-2" });
    await grantCoins("user-2", 10_000, "ADJUST", "uji-saldo-2");
    const r = await order([{ variantId: "v-hitam", qty: 1 }], { useCoins: true });
    await updateOrder({ id: r.orderId, status: "CANCELLED", trackingNo: "" });
    const refund = await db.coinEntry.findFirst({ where: { userId: "user-2", kind: "REFUND" } });
    expect(refund?.amount).toBe(10_000);
  });
});
