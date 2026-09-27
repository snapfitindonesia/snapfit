/**
 * Hemat kuota "Image Optimization" Vercel (Hobby 5.000 transformasi/bln).
 *
 * Foto marketplace (Shopee/Tokopedia/TikTok) dilayani LANGSUNG dari CDN mereka,
 * pakai varian ukuran bawaan CDN tsb (sudah JPEG terkompres) → 0 transformasi.
 * Foto kita di cdn.snapfit.id (R2 + Cloudflare) → juga langsung, pakai varian
 * ukuran .w128/.w384/.w750.webp yang dibuat saat upload (lib/upload/cdn.ts).
 * Host lain (mis. r2.dev yang DIBLOKIR sebagian ISP Indonesia) tetap lewat
 * /_next/image Vercel (loader default) supaya tetap tampil.
 *
 * CATATAN: jangan pasang sebagai `images.loader: "custom"` global — di Vercel
 * itu mematikan /_next/image (404) sehingga gambar r2.dev rusak. Dipakai
 * per-gambar lewat components/ui/image.tsx.
 */
import type { ImageLoader } from "next/image";

const DIRECT = [/(^|\.)ibyteimg\.com$/, /(^|\.)tiktokcdn\.com$/, /(^|\.)ginee\.com$/, /^cdn\.shopify\.com$/, /^placehold\.co$/];

// Tanda #w=… beda per lebar agar srcset valid & dev tak memperingatkan
// "loader does not implement width"; fragmen tak dikirim ke server → cache CDN utuh.
const tag = (url: string, width: number) => `${url}#w=${width}`;

const shopeeLoader: ImageLoader = ({ src, width }) =>
  // Sufiks _tn = thumbnail 320px (~20KB vs ~130KB asli) — hanya bila tak perlu diperbesar.
  tag(width <= 320 &&/\/file\/[^/_]+$/.test(new URL(src).pathname) ? `${src}_tn` : src, width);

const tokopediaLoader: ImageLoader = ({ src, width }) => {
  // Tak pernah di bawah lebar yang diminta → tidak ada pembesaran (tak blur).
  const size = width <= 300 ? 300 : width <= 500 ? 500 : 700;
  return tag(src.replace(/\/img\/cache\/[^/]+\//, `/img/cache/${size}/`), width);
};

const directLoader: ImageLoader = ({ src, width }) => tag(src, width);

// cdn.snapfit.id: varian terkecil yang lebarnya ≥ diminta (tak pernah diperbesar).
// Hanya file WebP di root bucket — semuanya punya varian (dijamin scripts/cdn-variants.mjs).
const CDN_HOST = "cdn.snapfit.id";
const cdnLoader: ImageLoader = ({ src, width }) => {
  const { pathname } = new URL(src);
  const isBase = /^\/[^/]+\.webp$/.test(pathname) && !/\.w\d+\.webp$/.test(pathname);
  // SAMAKAN dengan CDN_VARIANT_WIDTHS (lib/upload/cdn.ts); 0 = file asli (≤1200px).
  const w = width <= 128 ? 128 : width <= 384 ? 384 : width <= 750 ? 750 : 0;
  return tag(isBase && w ? src.replace(/\.webp$/, `.w${w}.webp`) : src, width);
};

/** True bila src adalah foto di CDN kita (cdn.snapfit.id). */
export function isOwnCdn(src: string): boolean {
  try {
    return new URL(src).hostname === CDN_HOST;
  } catch {
    return false;
  }
}

/** Loader langsung-ke-CDN untuk src ini, atau null → pakai optimasi Vercel. */
export function directLoaderFor(src: string): ImageLoader | null {
  let host: string;
  try {
    host = new URL(src).hostname;
  } catch {
    return null;
  }
  if (host === CDN_HOST) return cdnLoader;
  if (host === "cf.shopee.co.id" || host.endsWith(".susercontent.com")) return shopeeLoader;
  if (host === "images.tokopedia.net" && /\/img\/cache\/[^/]+\//.test(src)) return tokopediaLoader;
  if (DIRECT.some((re) => re.test(host))) return directLoader;
  return null;
}
