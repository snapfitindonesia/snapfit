import sharp from "sharp";
import type { HomeSection } from "@/lib/home/sections";

const cache = new Map<string, { w: number; h: number } | null>();

/** Ukuran asli foto (px). Foto CDN sendiri: baca varian 384px (rasio sama, unduhan kecil). */
async function sizeOf(url: string): Promise<{ w: number; h: number } | null> {
  if (cache.has(url)) return cache.get(url)!;
  let out: { w: number; h: number } | null = null;
  try {
    const small = /^https:\/\/cdn\.snapfit\.id\/[^/]+\.webp$/.test(url) && !/\.w\d+\.webp$/.test(url) ? url.replace(/\.webp$/, url.endsWith("-wide.webp") ? ".w750.webp" : ".w384.webp") : url;
    const res = await fetch(small, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const m = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
      if (m.width && m.height) out = { w: m.width, h: m.height };
    }
  } catch {
    out = null; // gagal → pakai rasio cadangan saat render
  }
  cache.set(url, out);
  return out;
}

/** Lengkapi imgW/imgH foto bentuk "Asli" di Blok Custom (dipanggil saat Simpan beranda). */
export async function fillImageSizes(sections: HomeSection[]): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const s of sections) {
    if (s.type !== "custom") continue;
    for (const b of s.blocks) {
      if (!b.image || b.ratio !== "auto") continue;
      jobs.push(
        sizeOf(b.image).then((d) => {
          if (d) {
            b.imgW = d.w;
            b.imgH = d.h;
          }
        }),
      );
    }
  }
  await Promise.all(jobs);
}
