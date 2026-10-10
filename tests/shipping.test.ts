import { afterEach, describe, expect, it, vi } from "vitest";

/** Modul ongkir dibaca ulang dengan env tertentu (ambang gratis ongkir dibaca saat modul dimuat). */
// Bawaan uji = TANPA gratis ongkir otomatis, tak bergantung env mesin/Vercel tempat tes berjalan.
async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ FREE_SHIPPING_MIN: "0", FREE_SHIPPING_MAX: "20000", ...env })) vi.stubEnv(k, v);
  return import("@/lib/shipping-calc");
}
afterEach(() => vi.unstubAllEnvs());

const DIY = { baseCost: 20_000, perKg: 8_000, etd: "1-2 hari", available: true };

describe("billableKg", () => {
  it("dibulatkan ke atas per kg, minimal 1 kg", async () => {
    const { billableKg } = await load();
    expect(billableKg(0)).toBe(1);
    expect(billableKg(200)).toBe(1);
    expect(billableKg(1000)).toBe(1);
    expect(billableKg(1001)).toBe(2);
    expect(billableKg(2500)).toBe(3);
  });
});

describe("computeZoneQuote (tanpa gratis ongkir otomatis — bawaan)", () => {
  it("1 kg = tarif dasar provinsi", async () => {
    const { computeZoneQuote } = await load();
    expect(computeZoneQuote(DIY, 400, 100_000, 5000)).toMatchObject({ cost: 20_000, fullCost: 20_000, subsidy: 0, kg: 1, zone: true, available: true, etd: "1-2 hari" });
  });

  it("kg berikutnya ditambah tarif per kg", async () => {
    const { computeZoneQuote } = await load();
    expect(computeZoneQuote(DIY, 2500, 100_000, 5000)).toMatchObject({ cost: 20_000 + 2 * 8_000, kg: 3 });
  });

  it("provinsi belum diatur → tarif flat", async () => {
    const { computeZoneQuote } = await load();
    expect(computeZoneQuote(null, 400, 100_000, 5000)).toMatchObject({ cost: 5000, zone: false, available: true });
  });

  it("provinsi tanpa kurir → tidak tersedia (checkout ditolak)", async () => {
    const { computeZoneQuote } = await load();
    expect(computeZoneQuote({ ...DIY, available: false }, 400, 100_000, 5000)).toMatchObject({ available: false, cost: 0 });
  });
});

describe("computeZoneQuote dengan ambang gratis ongkir (env)", () => {
  it("di bawah ambang → bayar penuh", async () => {
    const { computeZoneQuote } = await load({ FREE_SHIPPING_MIN: "150000", FREE_SHIPPING_MAX: "20000" });
    expect(computeZoneQuote(DIY, 400, 149_999, 5000)).toMatchObject({ cost: 20_000, subsidy: 0, free: false });
  });

  it("lolos ambang → potong s/d batas maksimal", async () => {
    const { computeZoneQuote } = await load({ FREE_SHIPPING_MIN: "150000", FREE_SHIPPING_MAX: "20000" });
    expect(computeZoneQuote(DIY, 2500, 150_000, 5000)).toMatchObject({ fullCost: 36_000, subsidy: 20_000, cost: 16_000, free: false });
    expect(computeZoneQuote(DIY, 400, 150_000, 5000)).toMatchObject({ cost: 0, free: true });
  });
});
