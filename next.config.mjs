/** @type {import('next').NextConfig} */
const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig = {
  images: {
    // AVIF (lebih kecil ~30-50%) lalu WebP → hemat bandwidth di mobile.
    formats: ["image/avif", "image/webp"],
    // Cache hasil optimasi lebih lama (gambar produk jarang berubah).
    minimumCacheTTL: 2678400, // 31 hari
    // Domain yang boleh dioptimasi next/image (lihat docs/07-deployment-dns.md).
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" }, // dev/placeholder
      { protocol: "https", hostname: "cdn.snapfit.id" }, // CDN aset produksi
      { protocol: "https", hostname: "**.r2.dev" }, // Cloudflare R2 public bucket
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" }, // R2 (jaga-jaga)
      { protocol: "https", hostname: "cdn.shopify.com" }, // foto katalog impor (sementara)
      { protocol: "https", hostname: "cf.shopee.co.id" }, // foto master produk Ginee (Shopee CDN)
      { protocol: "https", hostname: "**.susercontent.com" }, // foto Shopee (mirror)
      // Foto master produk Ginee bisa dari CDN marketplace mana pun:
      { protocol: "https", hostname: "**.ibyteimg.com" }, // TikTok Shop
      { protocol: "https", hostname: "**.tiktokcdn.com" }, // TikTok (cadangan)
      { protocol: "https", hostname: "**.slatic.net" }, // Lazada
      { protocol: "https", hostname: "**.tokopedia.net" }, // Tokopedia
      { protocol: "https", hostname: "images.tokopedia.com" }, // Tokopedia
      { protocol: "https", hostname: "**.static-src.com" }, // Blibli
      { protocol: "https", hostname: "**.bmdstatic.com" }, // Blibli (cadangan)
      { protocol: "https", hostname: "**.ginee.com" }, // CDN Ginee (cdn-public-prod-oss.ginee.com)
      ...extraHosts.map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
};

export default nextConfig;
