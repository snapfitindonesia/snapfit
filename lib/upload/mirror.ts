import { createHash } from "node:crypto";
import sharp from "sharp";
import { r2Config, uploadToR2 } from "@/lib/upload/cdn";

/**
 * Salin foto eksternal (Shopee/TikTok/Tokopedia/Ginee) ke CDN kita (R2 →
 * cdn.snapfit.id), dikompres WebP ≤1200px q80 — foto tak lagi numpang hotlink.
 * Nama file deterministik m-<sha1(url)>.webp (sama dgn scripts/mirror-marketplace-images.mjs)
 * → URL yang sama tak pernah diunggah dua kali.
 */
export function mirrorKey(url: string): string {
  return `m-${createHash("sha1").update(url).digest("hex").slice(0, 24)}.webp`;
}

function isExternal(url: string): boolean {
  const pub = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
  return /^https?:\/\//.test(url) && !(pub && url.startsWith(pub)) && !url.includes("r2.dev") && !url.includes("supabase.co");
}

async function mirrorOne(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: { "User-Agent": "Mozilla/5.0 (SNAPFIT image mirror)", Accept: "image/*" },
  });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const webp = await sharp(buf)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const out = await uploadToR2(webp, mirrorKey(url));
  if (!out) throw new Error("R2 belum dikonfigurasi");
  return out;
}

/**
 * Salin banyak URL sekaligus (paralel terbatas). Kembalikan peta URL asli → URL CDN.
 * URL yang gagal disalin TIDAK ada di peta (pemanggil tetap pakai URL asli).
 */
export async function mirrorImages(urls: (string | null | undefined)[], concurrency = 4): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!r2Config()) return map;
  const todo = [...new Set(urls.filter((u): u is string => !!u && isExternal(u)))];
  let i = 0;
  async function worker() {
    while (i < todo.length) {
      const u = todo[i++];
      try {
        map.set(u, await mirrorOne(u));
      } catch (e) {
        console.error("mirror gagal:", u.slice(0, 80), e instanceof Error ? e.message : e);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  return map;
}
