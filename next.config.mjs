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
      { protocol: "https", hostname: "cdn.shopify.com" }, // foto katalog impor (sementara)
      ...extraHosts.map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
};

export default nextConfig;
