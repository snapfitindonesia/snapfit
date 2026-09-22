/** @type {import('next').NextConfig} */
const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig = {
  images: {
    // Domain yang boleh dioptimasi next/image (lihat docs/07-deployment-dns.md).
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" }, // dev/placeholder
      { protocol: "https", hostname: "cdn.snapfit.id" }, // CDN aset produksi
      { protocol: "https", hostname: "**.r2.dev" }, // Cloudflare R2 public bucket
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" }, // R2 (jaga-jaga)
      { protocol: "https", hostname: "cdn.shopify.com" }, // foto katalog impor (sementara)
      { protocol: "https", hostname: "cf.shopee.co.id" }, // foto master produk Ginee (Shopee CDN)
      { protocol: "https", hostname: "**.susercontent.com" }, // foto Shopee (mirror)
      ...extraHosts.map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
};

export default nextConfig;
