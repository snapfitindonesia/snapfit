import { describe, expect, it } from "vitest";
import { activeCashback, cashbackFor, DEFAULT_COIN_RULES, maxCoinsUsable, normalizeCoinRules, type CoinPromo, type CoinRules } from "@/lib/coins-rules";

const rules = (o: Partial<CoinRules> = {}): CoinRules => ({ ...DEFAULT_COIN_RULES, ...o });
const promo = (o: Partial<CoinPromo>): CoinPromo => ({ id: "p", label: "Promo", percent: 5, kind: "custom", start: "", end: "", active: true, ...o });
/** Jam WIB → Date (UTC+7). */
const wib = (iso: string) => new Date(`${iso}+07:00`);

describe("aturan bawaan (disetujui 29 Sep 2026)", () => {
  it("2% cashback, bonus daftar 2.000, ulasan 500, pakai maks 30%, min 1.000, hangus 180 hari", () => {
    expect(DEFAULT_COIN_RULES).toMatchObject({ cashbackPercent: 2, signupBonus: 2000, reviewBonus: 500, maxUsePercent: 30, minUse: 1000, expireDays: 180 });
  });

  it("pengaturan rusak/kosong → kembali ke bawaan", () => {
    expect(normalizeCoinRules(null)).toEqual(DEFAULT_COIN_RULES);
    expect(normalizeCoinRules({ cashbackPercent: 3 }).cashbackPercent).toBe(3);
    expect(normalizeCoinRules({ cashbackPercent: "x" }).cashbackPercent).toBe(2);
  });
});

describe("cashbackFor", () => {
  it("2% dari belanja barang, dibulatkan ke bawah", () => {
    expect(cashbackFor(150_000, 2)).toBe(3000);
    expect(cashbackFor(99_999, 2)).toBe(1999);
  });
  it("tak pernah negatif", () => {
    expect(cashbackFor(-10_000, 2)).toBe(0);
  });
});

describe("maxCoinsUsable", () => {
  const r = rules();
  it("0 bila saldo di bawah minimum pakai", () => {
    expect(maxCoinsUsable(999, 100_000, 110_000, 10_000, r)).toBe(0);
  });
  it("maks. 30% subtotal", () => {
    expect(maxCoinsUsable(1_000_000, 100_000, 110_000, 10_000, r)).toBe(30_000);
  });
  it("tak lebih dari saldo", () => {
    expect(maxCoinsUsable(5_000, 100_000, 110_000, 10_000, r)).toBe(5_000);
  });
  it("tak boleh memotong ongkir (setelah voucher)", () => {
    // subtotal 100rb − voucher 95rb = 5rb barang + ongkir 10rb → koin maks 5rb
    expect(maxCoinsUsable(50_000, 100_000, 15_000, 10_000, r)).toBe(5_000);
  });
  it("saldo 0 → 0", () => {
    expect(maxCoinsUsable(0, 100_000, 110_000, 10_000, r)).toBe(0);
  });
});

describe("activeCashback (promo berjadwal, WIB)", () => {
  it("koin dimatikan → 0%", () => {
    expect(activeCashback(rules({ enabled: false }), wib("2026-10-10T12:00:00"))).toEqual({ percent: 0, promo: null, until: null });
  });

  it("tanpa promo → persen dasar", () => {
    expect(activeCashback(rules(), wib("2026-10-10T12:00:00")).percent).toBe(2);
  });

  it("promo custom berlaku dari 00:00 WIB tanggal mulai s/d 23:59 WIB tanggal selesai", () => {
    const r = rules({ promos: [promo({ percent: 5, start: "2026-10-10", end: "2026-10-12" })] });
    expect(activeCashback(r, wib("2026-10-09T23:59:00")).percent).toBe(2);
    expect(activeCashback(r, wib("2026-10-10T00:00:00")).percent).toBe(5);
    expect(activeCashback(r, wib("2026-10-12T23:59:00")).percent).toBe(5);
    expect(activeCashback(r, wib("2026-10-13T00:00:00")).percent).toBe(2);
  });

  it("promo nonaktif diabaikan", () => {
    const r = rules({ promos: [promo({ active: false, percent: 9, start: "2026-10-01", end: "2026-10-31" })] });
    expect(activeCashback(r, wib("2026-10-10T12:00:00")).percent).toBe(2);
  });

  it("beberapa promo berjalan → persen tertinggi", () => {
    const r = rules({
      promos: [
        promo({ id: "a", label: "A", percent: 4, start: "2026-10-01", end: "2026-10-31" }),
        promo({ id: "b", label: "B", percent: 7, start: "2026-10-10", end: "2026-10-10" }),
      ],
    });
    expect(activeCashback(r, wib("2026-10-10T08:00:00"))).toMatchObject({ percent: 7, promo: "B" });
  });

  it("promo lebih kecil dari dasar tidak menurunkan cashback", () => {
    const r = rules({ cashbackPercent: 3, promos: [promo({ percent: 1, start: "2026-10-01", end: "2026-10-31" })] });
    expect(activeCashback(r, wib("2026-10-10T08:00:00")).percent).toBe(3);
  });

  it("Payday: tgl 25 00:00 – tgl 28 23:59 WIB", () => {
    const r = rules({ promos: [promo({ kind: "payday-sale", label: "Payday", percent: 5 })] });
    expect(activeCashback(r, wib("2026-10-24T23:59:00")).percent).toBe(2);
    expect(activeCashback(r, wib("2026-10-25T00:00:00")).percent).toBe(5);
    expect(activeCashback(r, wib("2026-10-28T23:59:00")).percent).toBe(5);
    expect(activeCashback(r, wib("2026-10-29T00:00:00")).percent).toBe(2);
  });

  it("Tanggal kembar: hanya tanggal = bulan (10.10)", () => {
    const r = rules({ promos: [promo({ kind: "tanggal-kembar", label: "10.10", percent: 6 })] });
    expect(activeCashback(r, wib("2026-10-10T15:00:00")).percent).toBe(6);
    expect(activeCashback(r, wib("2026-10-11T00:00:00")).percent).toBe(2);
  });
});
