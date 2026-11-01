// Rumus promo Buy 1 Get 1 (lib/b1g1.ts) — dipakai keranjang (browser) & pesanan (server).
import { describe, expect, it } from "vitest";
import { b1g1Discount } from "@/lib/b1g1";

const line = (variantId: string, unitPrice: number, qty = 1, eligible = true) => ({ variantId, unitPrice, qty, eligible });

describe("b1g1Discount", () => {
  it("2 unit peserta → yang lebih murah gratis", () => {
    expect(b1g1Discount([line("a", 89_000), line("b", 50_000)])).toEqual({ discount: 50_000, free: { b: 1 }, eligibleUnits: 2 });
  });
  it("varian sama qty 2 → 1 gratis", () => {
    expect(b1g1Discount([line("a", 89_000, 2)]).discount).toBe(89_000);
  });
  it("4 unit → 2 termurah gratis (bukan per pasangan berurutan)", () => {
    const r = b1g1Discount([line("a", 100_000), line("b", 90_000), line("c", 10_000), line("d", 5_000)]);
    expect(r.discount).toBe(15_000);
    expect(r.free).toEqual({ c: 1, d: 1 });
  });
  it("jumlah ganjil → unit termahal tetap dibayar", () => {
    const r = b1g1Discount([line("a", 100_000, 3)]);
    expect(r.discount).toBe(100_000);
    expect(r.eligibleUnits).toBe(3);
  });
  it("produk bukan peserta tak dihitung & tak ikut dipasangkan", () => {
    expect(b1g1Discount([line("a", 100_000), line("x", 20_000, 1, false)]).discount).toBe(0);
    expect(b1g1Discount([line("a", 100_000), line("b", 60_000), line("x", 20_000, 5, false)]).discount).toBe(60_000);
  });
  it("keranjang kosong / harga 0 → tanpa potongan", () => {
    expect(b1g1Discount([]).discount).toBe(0);
    expect(b1g1Discount([line("a", 0, 2)]).discount).toBe(0);
  });
});
