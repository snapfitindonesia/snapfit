/** @type {import('next').NextConfig} */
const extraHosts = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

// Supabase Storage milik sendiri (cadangan upload bila R2 tak aktif, app/api/admin/upload).
let supabaseHost = null;
try {
  supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname || null;
} catch {
  supabaseHost = null;
}

const nextConfig = {
  // `radix-ui` adalah barrel: tanpa ini `import { Slot }` (tombol) ikut menarik
  // Dialog/DropdownMenu/Popover (±70KB gzip) ke setiap halaman toko.
  experimental: { optimizePackageImports: ["radix-ui"] },
  // Prisma engineType "client" memuat query compiler WASM lewat fs (tak terlacak otomatis) →
  // tanpa ini semua query di Vercel gagal ENOENT (hanya jalan di lokal karena file ada di disk).
  outputFileTracingIncludes: {
    "/": ["./node_modules/.prisma/client/query_compiler_bg.wasm"],
    "/**/*": ["./node_modules/.prisma/client/query_compiler_bg.wasm"],
  },
  // Header keamanan dasar untuk semua halaman. Bingkai hanya dari situs sendiri (pratinjau email di admin
  // memakai iframe same-origin) → panel admin tak bisa disisipkan di situs lain (clickjacking).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
  // /produk polos = halaman statis (cache CDN); versi berparameter dirender dinamis di
  // /produk/filter tanpa mengubah URL di browser. beforeFiles: dicek sebelum rute halaman.
  // SEMUA kunci filter yang ditulis ProductListing ke URL ikut di-rewrite — tanpa ini link filter yang
  // dibagikan / di-refresh jatuh ke /produk statis & filternya hilang.
  async rewrites() {
    return {
      beforeFiles: ["tipe", "model", "sort", "q", "perangkat", "brand", "minPrice", "maxPrice"].map((key) => ({
        source: "/produk",
        has: [{ type: "query", key }],
        destination: "/produk/filter",
      })),
    };
  },
  images: {
    // Foto marketplace dilayani langsung dari CDN-nya via components/ui/image.tsx
    // (JANGAN loader custom global — mematikan /_next/image di Vercel).
    // WebP saja (AVIF menggandakan jumlah transformasi per gambar).
    formats: ["image/webp"],
    // Cache hasil optimasi lebih lama (gambar produk jarang berubah).
    minimumCacheTTL: 2678400, // 31 hari
    // Domain yang boleh dioptimasi next/image (lihat docs/07-deployment-dns.md).
    // SEMPIT sengaja: wildcard (**.r2.dev, CDN marketplace) membuat siapa pun bisa memakai
    // /_next/image kita untuk gambar dari bucket/host mana saja → kuota transformasi Vercel habis.
    // Semua foto toko kini di cdn.snapfit.id (impor Ginee disalin ke CDN, lib/upload/mirror.ts) dan
    // foto marketplace yang tersisa dilayani loader langsung (lib/image-loader.ts, tanpa /_next/image).
    // Host tambahan: env NEXT_PUBLIC_IMAGE_HOSTS (dipisah koma).
    remotePatterns: [
      { protocol: "https", hostname: "cdn.snapfit.id" }, // CDN aset produksi (R2 + Cloudflare)
      { protocol: "https", hostname: "placehold.co" }, // dev/placeholder
      ...(supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
      ...extraHosts.map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
};

export default nextConfig;
