// Halaman /buy1get1 (Admin → Halaman Buy 1 Get 1) ke database sementara.
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { savePromoPage } from "@/lib/actions/promo-page";
import { getPromoPageConfig, getPromoProducts } from "@/lib/promo-page/data";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_KEY, parsePromoPage, placeholder, promoPageSchema } from "@/lib/promo-page/config";
import { resetDb, seedStore } from "../support/fixtures";

beforeEach(async () => {
  await resetDb();
  await seedStore();
});

describe("pengaturan halaman Buy 1 Get 1", () => {
  it("belum pernah disimpan → isi bawaan (semua bagian tampil)", async () => {
    const c = await getPromoPageConfig();
    expect(c.title).toBe(DEFAULT_PROMO_PAGE.title);
    expect(c.sections.every((s) => s.active)).toBe(true);
  });

  it("simpan: urutan & sembunyi bagian tersimpan; produk yang tak ada dibuang", async () => {
    const [p] = await db.product.findMany({ take: 1, select: { id: true } });
    const sections = [...DEFAULT_PROMO_PAGE.sections].reverse().map((s, i) => ({ ...s, active: i !== 0 }));
    const r = await savePromoPage({ ...DEFAULT_PROMO_PAGE, sections, products: { ...DEFAULT_PROMO_PAGE.products, productIds: [p!.id, "id-palsu"] } });
    expect(r).toEqual({ ok: true });
    const saved = parsePromoPage((await db.siteSetting.findUniqueOrThrow({ where: { key: PROMO_PAGE_KEY } })).value);
    expect(saved.sections.map((s) => s.key)).toEqual(sections.map((s) => s.key));
    expect(saved.sections[0]!.active).toBe(false);
    expect(saved.products.productIds).toEqual([p!.id]);
  });

  it("tautan berbahaya ditolak (hanya /, https:// atau #bagian)", async () => {
    const withHref = (href: string) => ({ ...DEFAULT_PROMO_PAGE, hero: { ...DEFAULT_PROMO_PAGE.hero, href } });
    for (const bad of ["javascript:alert(1)", "//evil.com", "data:text/html,x"]) {
      expect(promoPageSchema.safeParse(withHref(bad)).success).toBe(false);
    }
    expect((await savePromoPage(withHref("javascript:alert(1)"))).ok).toBe(false);
    for (const ok of ["#produk-promo", "/kategori/iphone", "https://shopee.co.id/snapfitindonesia", ""]) {
      expect(promoPageSchema.safeParse(withHref(ok)).success).toBe(true);
    }
    expect(promoPageSchema.safeParse(DEFAULT_PROMO_PAGE).success).toBe(true); // isi bawaan selalu valid
  });

  it("data lama tanpa bagian baru → bagian baru ditambahkan (tersembunyi), data rusak → bawaan", () => {
    const old = { ...DEFAULT_PROMO_PAGE, sections: DEFAULT_PROMO_PAGE.sections.filter((s) => s.key !== "seo") };
    const c = parsePromoPage(old);
    expect(c.sections.at(-1)).toEqual({ key: "seo", active: false });
    expect(parsePromoPage({ rusak: true })).toEqual(DEFAULT_PROMO_PAGE);
  });

  it("produk promo tampil sesuai urutan dashboard", async () => {
    const ids = (await db.product.findMany({ select: { id: true } })).map((p) => p.id);
    const wanted = [...ids].reverse();
    const items = await getPromoProducts(wanted);
    expect(items.map((p) => p.id)).toEqual(wanted.filter((id) => items.some((p) => p.id === id)));
  });

  it("placeholder banner = SVG bertuliskan ukurannya", () => {
    const src = placeholder(1280, 720, "Banner utama");
    expect(src.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(src)).toContain("Banner utama · 1280 × 720");
  });
});

describe("produk \"hanya di halaman promo\"", () => {
  it("hilang dari daftar/pencarian/sitemap/feed, tetap tampil di /buy1get1 & tetap bisa dibeli", async () => {
    const { getProducts } = await import("@/lib/actions/product");
    const { default: sitemap } = await import("@/app/sitemap");
    const { GET: feed } = await import("@/app/feed/products.xml/route");
    const { createOrder } = await import("@/lib/actions/order");
    const { ADDRESS } = await import("../support/fixtures");
    const lain = await db.product.create({
      data: { slug: "case-lain", shortId: 1002, name: "Case Lain", coverImage: "https://cdn.snapfit.id/lain.webp", variants: { create: [{ id: "v-lain", name: "Hitam", price: 70_000, stock: 5, image: "x", weight: 200 }] } },
    });
    const uji = await db.product.findUniqueOrThrow({ where: { slug: "case-uji" } });
    const all = async () => (await getProducts({ sort: "terbaru", skip: 0, take: 48 })).items.map((p) => p.id);
    expect(await all()).toEqual(expect.arrayContaining([uji.id, lain.id]));

    // Case Uji jadi "hanya di halaman promo"; Case Lain ikut promo tapi tetap tampil di website.
    const r = await savePromoPage({ ...DEFAULT_PROMO_PAGE, products: { ...DEFAULT_PROMO_PAGE.products, productIds: [uji.id, lain.id], hiddenIds: [uji.id, "bukan-peserta"] } });
    expect(r.ok).toBe(true);
    expect((await getPromoPageConfig()).products.hiddenIds).toEqual([uji.id]); // id di luar daftar promo dibuang

    expect(await all()).toEqual([lain.id]);
    expect((await getProducts({ sort: "terbaru", skip: 0, take: 48, q: "uji" })).items).toHaveLength(0);
    expect((await getPromoProducts([uji.id, lain.id])).map((p) => p.id)).toEqual([uji.id, lain.id]);

    const urls = (await sitemap()).map((u) => u.url);
    expect(urls.some((u) => u.includes("case-uji"))).toBe(false);
    expect(urls.some((u) => u.includes("case-lain"))).toBe(true);
    const xml = await (await feed()).text();
    expect(xml).not.toContain("Case Uji");
    expect(xml).toContain("Case Lain");

    // Tetap bisa dibeli (dari halaman promo → halaman produk → keranjang).
    const o = await createOrder({ address: ADDRESS, items: [{ variantId: "v-hitam", qty: 1 }] } as Parameters<typeof createOrder>[0]);
    expect("error" in o).toBe(false);
  });
});
