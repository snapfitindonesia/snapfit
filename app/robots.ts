import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Halaman privat/transaksional — jangan di-index.
      disallow: [
        "/admin", "/api", "/checkout", "/keranjang", "/akun", "/berhenti", "/ulasan", "/masuk", "/daftar", "/reset-password", "/lupa-password",
        // Variasi URL daftar produk yang hanya mengurutkan/mencari/menyaring harga: isinya duplikat & dirender ulang tiap
        // dikunjungi (tanpa cache) → bot yang menjelajah semua kombinasi menghabiskan CPU Vercel. Filter tipe/model/merek tetap boleh.
        "/produk/filter", "/*?*sort=", "/*?*q=", "/*?*minPrice=", "/*?*maxPrice=",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
