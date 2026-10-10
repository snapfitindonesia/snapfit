import { describe, expect, it } from "vitest";
import { canCombine, computeVoucherBenefit, mergeVoucher, MAX_VOUCHERS, type VoucherLike } from "@/lib/voucher";

const potongan = (o: Partial<VoucherLike> = {}): VoucherLike => ({
  code: "SNAP10K", type: "POTONGAN", amount: 10_000, minPurchase: 0, maxBenefit: 0, active: true, stackable: true, ...o,
});
const ongkir = (o: Partial<VoucherLike> = {}): VoucherLike => ({
  code: "GRATISONGKIR", type: "GRATIS_ONGKIR", amount: 0, minPurchase: 0, maxBenefit: 0, active: true, stackable: true, ...o,
});

describe("computeVoucherBenefit", () => {
  it("menolak voucher nonaktif", () => {
    expect(computeVoucherBenefit(potongan({ active: false }), 100_000, 10_000)).toEqual({ valid: false, reason: "Voucher tidak aktif." });
  });

  it("menolak bila belanja di bawah minimum", () => {
    const r = computeVoucherBenefit(potongan({ minPurchase: 150_000 }), 149_999, 10_000);
    expect(r.valid).toBe(false);
  });

  it("menerima tepat di batas minimum", () => {
    expect(computeVoucherBenefit(potongan({ minPurchase: 150_000 }), 150_000, 10_000)).toEqual({ valid: true, discount: 10_000, freeShipping: false });
  });

  it("potongan dibatasi maxBenefit", () => {
    expect(computeVoucherBenefit(potongan({ amount: 50_000, maxBenefit: 20_000 }), 300_000, 0)).toMatchObject({ discount: 20_000 });
  });

  it("potongan tak pernah melebihi subtotal (total tak bisa minus)", () => {
    expect(computeVoucherBenefit(potongan({ amount: 50_000 }), 30_000, 10_000)).toMatchObject({ discount: 30_000 });
  });

  it("gratis ongkir = ongkir, dibatasi maxBenefit bila diisi", () => {
    expect(computeVoucherBenefit(ongkir(), 100_000, 18_000)).toEqual({ valid: true, discount: 18_000, freeShipping: true });
    expect(computeVoucherBenefit(ongkir({ maxBenefit: 20_000 }), 100_000, 35_000)).toMatchObject({ discount: 20_000 });
  });

  it("gratis ongkir saat ongkir 0 → potongan 0", () => {
    expect(computeVoucherBenefit(ongkir(), 100_000, 0)).toMatchObject({ valid: true, discount: 0 });
  });
});

describe("aturan gabung voucher", () => {
  it("maksimal 2 voucher per pesanan", () => {
    expect(MAX_VOUCHERS).toBe(2);
  });

  it("potongan + gratis ongkir boleh digabung bila keduanya 'Bisa digabung'", () => {
    expect(canCombine(potongan(), ongkir())).toBe(true);
  });

  it("dua voucher sejenis TIDAK PERNAH bisa digabung", () => {
    expect(canCombine(potongan(), potongan({ code: "LAIN" }))).toBe(false);
    expect(canCombine(ongkir(), ongkir({ code: "LAIN" }))).toBe(false);
  });

  it("tidak bisa digabung bila salah satu tidak ditandai 'Bisa digabung'", () => {
    expect(canCombine(potongan({ stackable: false }), ongkir())).toBe(false);
    expect(canCombine(potongan(), ongkir({ stackable: false }))).toBe(false);
  });

  it("memasang voucher sejenis menggantikan yang lama", () => {
    const a = potongan({ code: "A" });
    const b = potongan({ code: "B" });
    expect(mergeVoucher([a], b)).toEqual({ list: [b], replaced: [a] });
  });

  it("memasang gratis ongkir mempertahankan potongan yang bisa digabung", () => {
    const a = potongan();
    const o = ongkir();
    expect(mergeVoucher([a], o)).toEqual({ list: [a, o], replaced: [] });
  });

  it("memasang ulang kode yang sama tidak menduplikasi", () => {
    const a = potongan();
    expect(mergeVoucher([a], a).list).toEqual([a]);
  });
});
