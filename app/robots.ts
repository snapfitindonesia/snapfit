import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Halaman privat/transaksional — jangan di-index.
      disallow: ["/admin", "/api", "/checkout", "/keranjang", "/akun", "/masuk", "/daftar", "/reset-password", "/lupa-password"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
