import { describe, expect, it } from "vitest";
import { filterHref, matchesFilter, parseFilter } from "@/lib/promo-page/filter";

const item = { slugs: ["samsung", "galaxy-s", "galaxy-s25"], text: "snapfit case galaxy s25 ultra\u0000hitam" };

describe("saringan halaman promo", () => {
  it("tautan & parse bolak-balik", () => {
    expect(filterHref({ kat: "galaxy-s25", q: "tempered glass" })).toBe("?kat=galaxy-s25&q=tempered+glass");
    expect(parseFilter("?kat=galaxy-s25&q=tempered+glass")).toEqual({ kat: "galaxy-s25", q: "tempered glass" });
    expect(filterHref({})).toBe("?");
    expect(parseFilter("?")).toEqual({ kat: undefined, q: undefined });
  });

  it("cocok per kategori (termasuk induk) & per kata", () => {
    expect(matchesFilter(item, { kat: "samsung" })).toBe(true);
    expect(matchesFilter(item, { kat: "iphone" })).toBe(false);
    expect(matchesFilter(item, { q: "Case S25" })).toBe(true);
    expect(matchesFilter(item, { kat: "galaxy-s25", q: "lens" })).toBe(false);
    expect(matchesFilter(item, {})).toBe(true);
  });
});
