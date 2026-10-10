// Penjaga backup harian: kapan admin diberi tahu.
import { describe, expect, it } from "vitest";
import { backupAgeWarning, backupLooksWrong } from "@/lib/backup";

const at = (iso: string) => new Date(iso).getTime();
const file = (day: string) => ({ key: `db/snapfit-${day}.json.gz`, date: new Date(`${day}T00:00:00Z`) });

describe("umur backup (dicek cron 12:00 UTC)", () => {
  it("backup semalam (20:00 UTC kemarin) → aman", () => {
    expect(backupAgeWarning(file("2026-10-09"), at("2026-10-10T12:00:00Z"))).toBeNull();
  });
  it("satu hari terlewat → peringatan", () => {
    expect(backupAgeWarning(file("2026-10-08"), at("2026-10-10T12:00:00Z"))).toMatch(/2026-10-08/);
  });
  it("belum ada backup sama sekali → peringatan", () => {
    expect(backupAgeWarning(undefined, at("2026-10-10T12:00:00Z"))).toMatch(/Belum ada/);
  });
});

describe("isi backup", () => {
  it("normal → aman; produk/varian kosong → mencurigakan", () => {
    expect(backupLooksWrong({ products: 126, variants: 900, orders: 0 })).toBeNull();
    expect(backupLooksWrong({ products: 0, variants: 0 })).toMatch(/produk kosong/);
    expect(backupLooksWrong({ products: 5, variants: 0 })).toMatch(/varian kosong/);
  });
});
