/**
 * Hemat kuota "Image Optimization" Vercel (Hobby 5.000 transformasi/bln).
 *
 * Foto marketplace (Shopee/Tokopedia/TikTok) dilayani LANGSUNG dari CDN mereka,
 * pakai varian ukuran bawaan CDN tsb (sudah JPEG terkompres) → 0 transformasi.
 * Foto upload admin ada di cdn.snapfit.id (R2 + Cloudflare) → juga langsung.
 * Host lain (mis. r2.dev yang DIBLOKIR sebagian ISP Indonesia) tetap lewat
 * /_next/image Vercel (loader default) supaya tetap tampil.
 *
 * CATATAN: jangan pasang sebagai `images.loader: "custom"` global — di Vercel
 * itu mematikan /_next/image (404) sehingga gambar r2.dev rusak. Dipakai
 * per-gambar lewat components/ui/image.tsx.
 */
import type { ImageLoader } from "next/image";

// cdn.snapfit.id = bucket R2 kita via Cloudflare (sudah WebP 1200px terkompres saat upload).
const DIRECT = [/^cdn\.snapfit\.id$/, /(^|\.)ibyteimg\.com$/, /(^|\.)tiktokcdn\.com$/, /(^|\.)ginee\.com$/, /^cdn\.shopify\.com$/, /^placehold\.co$/];

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

/** Loader langsung-ke-CDN untuk src ini, atau null → pakai optimasi Vercel. */
export function directLoaderFor(src: string): ImageLoader | null {
  let host: string;
  try {
    host = new URL(src).hostname;
  } catch {
    return null;
  }
  if (host === "cf.shopee.co.id" || host.endsWith(".susercontent.com")) return shopeeLoader;
  if (host === "images.tokopedia.net" && /\/img\/cache\/[^/]+\//.test(src)) return tokopediaLoader;
  if (DIRECT.some((re) => re.test(host))) return directLoader;
  return null;
}
