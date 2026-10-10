import { describe, expect, it, vi, afterEach } from "vitest";
import { activeDiscountPercent, applyDiscount } from "@/lib/format";
import { isPlaceholderPrice, sellableStock } from "@/lib/price-guard";
import { cartTotals, mergeLines } from "@/lib/cart-lines";

afterEach(() => vi.useRealTimers());

describe("applyDiscount", () => {
  it("tanpa diskon → harga asli", () => {
    expect(applyDiscount(89_000, 0)).toBe(89_000);
  });
  it("dibulatkan ke rupiah terdekat", () => {
    expect(applyDiscount(89_000, 15)).toBe(75_650);
    expect(applyDiscount(99_999, 33)).toBe(66_999);
  });
});

describe("activeDiscountPercent (periode diskon)", () => {
  const now = new Date("2026-10-10T05:00:00Z");
  const d = (o: Partial<{ percent: number; active: boolean; startAt: Date | null; endAt: Date | null }>) => ({ percent: 10, active: true, startAt: null, endAt: null, ...o });

  it("diskon terbesar yang sedang berlaku", () => {
    vi.useFakeTimers({ now });
    expect(activeDiscountPercent([d({ percent: 10 }), d({ percent: 25 })])).toBe(25);
  });
  it("nonaktif, belum mulai, atau sudah berakhir → diabaikan", () => {
    vi.useFakeTimers({ now });
    expect(
      activeDiscountPercent([
        d({ percent: 50, active: false }),
        d({ percent: 40, startAt: new Date("2026-10-11T00:00:00Z") }),
        d({ percent: 30, endAt: new Date("2026-10-09T00:00:00Z") }),
        d({ percent: 5 }),
      ]),
    ).toBe(5);
  });
  it("tanpa diskon → 0", () => {
    expect(activeDiscountPercent([])).toBe(0);
  });
});

describe("harga placeholder dari marketplace", () => {
  it("deretan angka 9 (≥5 digit) & ≤0 dianggap tidak dijual", () => {
    for (const p of [99_999, 999_999, 9_999_999, 0, -1]) expect(isPlaceholderPrice(p)).toBe(true);
  });
  it("harga premium asli tetap dijual", () => {
    for (const p of [9_999, 945_000, 1_700_000, 89_000]) expect(isPlaceholderPrice(p)).toBe(false);
  });
  it("stok varian placeholder = 0", () => {
    expect(sellableStock({ price: 999_999, stock: 50 })).toBe(0);
    expect(sellableStock({ price: 89_000, stock: 50 })).toBe(50);
  });
});

describe("mergeLines (keranjang)", () => {
  it("varian sama di beberapa baris dijumlah (stok dicek terhadap total)", () => {
    expect(mergeLines([{ variantId: "a", qty: 3 }, { variantId: "b", qty: 1 }, { variantId: "a", qty: 2 }])).toEqual([
      { variantId: "a", qty: 5 },
      { variantId: "b", qty: 1 },
    ]);
  });
  it("keranjang tanpa duplikat tidak berubah", () => {
    expect(mergeLines([{ variantId: "a", qty: 1 }])).toEqual([{ variantId: "a", qty: 1 }]);
  });
});

describe("cartTotals (berat & subtotal — dipakai checkout, cek ongkir & pesanan)", () => {
  const v = [
    { id: "a", weight: 200, price: 100_000, discounts: [{ percent: 10, active: true, startAt: null, endAt: null }] },
    { id: "b", weight: 1500, price: 50_000 },
  ];
  it("subtotal pakai harga setelah diskon, berat dijumlah per qty", () => {
    expect(cartTotals([{ variantId: "a", qty: 2 }, { variantId: "b", qty: 1 }], v)).toEqual({ weight: 1900, subtotal: 230_000, missing: [] });
  });
  it("baris varian yang sama dihitung semuanya", () => {
    expect(cartTotals([{ variantId: "b", qty: 1 }, { variantId: "b", qty: 2 }], v)).toMatchObject({ weight: 4500, subtotal: 150_000 });
  });
  it("varian tak ditemukan dilaporkan, tidak dihitung", () => {
    expect(cartTotals([{ variantId: "x", qty: 1 }, { variantId: "b", qty: 1 }], v)).toEqual({ weight: 1500, subtotal: 50_000, missing: ["x"] });
  });
});
