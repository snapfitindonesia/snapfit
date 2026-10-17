// Foto CDN dilayani lewat Bunny (IMG_BASE) atau situs sendiri (/img/…) — lihat lib/image-loader.ts.
import { describe, expect, it } from "vitest";
import { IMG_BASE, IMG_PROXY, siteImageUrl } from "@/lib/image-loader";

describe("siteImageUrl", () => {
  it("foto cdn.snapfit.id → /img/… dengan varian ukuran terkecil yang cukup", () => {
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 100, IMG_PROXY)).toBe("/img/m-abc.w128.webp");
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 300, IMG_PROXY)).toBe("/img/m-abc.w384.webp");
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 700, IMG_PROXY)).toBe("/img/m-abc.w750.webp");
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 1600, IMG_PROXY)).toBe("/img/m-abc.webp"); // asli ≤1200px
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", undefined, IMG_PROXY)).toBe("/img/m-abc.webp");
  });
  it("foto lebar beranda → varian 750/1200/1800", () => {
    expect(siteImageUrl("https://cdn.snapfit.id/h-1-wide.webp", 1100, IMG_PROXY)).toBe("/img/h-1-wide.w1200.webp");
    expect(siteImageUrl("https://cdn.snapfit.id/h-1-wide.webp", 3000, IMG_PROXY)).toBe("/img/h-1-wide.webp");
  });
  it("varian yang sudah ada / file non-WebP tidak diubah ukurannya", () => {
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.w384.webp", 128, IMG_PROXY)).toBe("/img/m-abc.w384.webp");
    expect(siteImageUrl("https://cdn.snapfit.id/lama.jpg", 128, IMG_PROXY)).toBe("/img/lama.jpg");
  });
  it("host lain & URL relatif dibiarkan apa adanya", () => {
    expect(siteImageUrl("https://down-id.img.susercontent.com/file/x", 128)).toBe("https://down-id.img.susercontent.com/file/x");
    expect(siteImageUrl("/logo.png", 128)).toBe("/logo.png");
  });
  it("Bunny CDN (bawaan IMG_BASE; saklar NEXT_PUBLIC_IMG_BASE=/img → lewat Vercel)", () => {
    const bunny = "https://snapfit.b-cdn.net";
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 300, bunny)).toBe(`${bunny}/m-abc.w384.webp`);
    expect(siteImageUrl("https://cdn.snapfit.id/h-1-wide.webp", 700, bunny)).toBe(`${bunny}/h-1-wide.w750.webp`);
    expect(siteImageUrl("https://cdn.snapfit.id/m-abc.webp", 300)).toBe(`${IMG_BASE}/m-abc.w384.webp`);
  });
});
