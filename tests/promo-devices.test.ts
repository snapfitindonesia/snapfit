import { describe, expect, it } from "vitest";
import { deviceSlugs, inferDevices } from "@/lib/promo-page/devices";
import { getPromoMenu, type PromoMenuItem } from "@/lib/promo-page/menu";
import { DEFAULT_PROMO_PAGE } from "@/lib/promo-page/config";

const models = (name: string) => inferDevices(name).map((d) => d.model?.name ?? d.line.name);

describe("inferDevices", () => {
  it("mengenali perangkat dari judul listing Shopee", () => {
    expect(models("[BUY 1 GET 1] Case Samsung Z Fold 4 Fold4 GKK Armored Kickstand")).toEqual(["Galaxy Z Fold 4"]);
    expect(models("[BUY 1 GET 1] Case iPhone 13 Pro Max 13 Pro 13 Sulada")).toEqual(["iPhone 13"]);
    expect(models("Case iPad Pro 11 M2 2022 iPad Air 10.9 Switcheasy")).toEqual(["iPad Pro", "iPad Air"]);
    expect(models("CaseSamsung S23 Ultra Plus Case VRS")).toEqual(["Galaxy S23"]);
    expect(models("Case Xiaomi Redmi 15C 5G SNAPFIT")).toEqual(["Redmi 15C"]);
    expect(models("SNAPFIT Case Redmi Note 15 MagSafe")).toEqual(["Redmi Note 15"]);
    expect(models("Case VIVO V60 5G SNAPFIT")).toEqual(["Vivo V60"]);
    expect(models("SNAPFIT Tas HP Wanita Slempang")).toEqual([]);
  });

  it("lini bernama sama dengan merek memakai slug lain (Xiaomi 17 ≠ semua Xiaomi)", () => {
    expect(deviceSlugs("Case Xiaomi 17 Pro Max")).toEqual(["xiaomi", "xiaomi-series", "xiaomi-17"]);
  });
});

describe("getPromoMenu", () => {
  const item = (id: string, name: string): PromoMenuItem => ({ id, name, image: `${id}.jpg`, slugs: deviceSlugs(name), text: name.toLowerCase() });
  const menu = getPromoMenu(DEFAULT_PROMO_PAGE, [
    item("a", "Case iPhone 13 Pro"),
    item("b", "Case iPhone 15 Pro Max"),
    item("c", "Case iPhone 15 Pro Max Tempered Glass"),
    item("d", "Case Samsung Galaxy Z Fold 5 Fold5"),
  ]);

  it("merek terbanyak dulu, model terbaru dulu, hanya yang punya produk", () => {
    expect(menu.segments.map((s) => s.label)).toEqual(["Apple", "Samsung"]);
    const iphone = menu.segments[0].categories.find((c) => c.name === "iPhone")!;
    expect(iphone.groups[0].links.map((l) => l.label)).toEqual(["iPhone 15", "iPhone 13"]);
    expect(menu.segments[0].image).toBe("a.jpg");
    expect(menu.labels["galaxy-z-fold-5"]).toBe("Galaxy Z Fold 5");
  });
});
