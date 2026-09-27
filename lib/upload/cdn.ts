import sharp from "sharp";
import { AwsClient } from "aws4fetch";

/**
 * Kompres + resize gambar apa pun → WebP (maks 1200px, quality 80).
 * Ukuran biasanya turun 70-90%.
 */
export async function compressToWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate() // hormati orientasi EXIF
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

/* ---------- Varian ukuran (dimuat langsung dari cdn.snapfit.id) ---------- */

// Tiap foto .webp disimpan 4 ukuran: asli (≤1200px) + `.w128/.w384/.w750.webp` — lebar
// = titik srcset bawaan next/image yang paling sering diminta (thumbnail, kartu, banner HP).
// lib/image-loader.ts memilih varian terkecil yang ≥ lebar diminta → kartu produk
// di HP tak mengunduh foto 1200px, tanpa kuota Image Optimization Vercel.
// SAMAKAN dengan scripts/cdn-variants.mjs & scripts/mirror-marketplace-images.mjs.
export const CDN_VARIANT_WIDTHS = [128, 384, 750] as const;
export const variantKey = (key: string, width: number) => key.replace(/\.webp$/, `.w${width}.webp`);

async function makeVariant(buffer: Buffer, width: number): Promise<Buffer> {
  return sharp(buffer).resize({ width, height: width, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
}

/* ---------- Cloudflare R2 (S3-compatible, egress gratis) ---------- */

type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicUrl: string };

export function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL; // mis. https://cdn.snapfit.id atau https://pub-xxx.r2.dev
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/$/, "") };
}

function r2(cfg: R2Config) {
  const client = new AwsClient({ accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey, service: "s3", region: "auto" });
  const url = (key: string) => `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
  return { client, url };
}

async function put(cfg: R2Config, key: string, buffer: Buffer): Promise<void> {
  const { client, url } = r2(cfg);
  const body = new Uint8Array(buffer);
  const res = await client.fetch(url(key), {
    method: "PUT",
    body,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.byteLength), // R2 wajib (runtime Vercel tak auto-isi)
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!res.ok) throw new Error(`R2 ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 200));
}

/**
 * Upload buffer WebP ke R2 + varian 128/384/750 (untuk .webp). Varian diunggah
 * DULU, file asli terakhir → URL baru dipakai hanya bila semua ukuran sudah ada.
 * Kembalikan public URL, atau null bila R2 belum dikonfigurasi.
 */
export async function uploadToR2(buffer: Buffer, filename: string): Promise<string | null> {
  const cfg = r2Config();
  if (!cfg) return null;
  if (filename.endsWith(".webp")) {
    await Promise.all(CDN_VARIANT_WIDTHS.map(async (w) => put(cfg, variantKey(filename, w), await makeVariant(buffer, w))));
  }
  await put(cfg, filename, buffer);
  return `${cfg.publicUrl}/${filename}`;
}

/** Hapus objek (+ variannya) dari R2. True bila sukses / memang tak ada (404). */
export async function deleteFromR2(filename: string): Promise<boolean> {
  const cfg = r2Config();
  if (!cfg) return false;
  const { client, url } = r2(cfg);
  const keys = filename.endsWith(".webp") ? [filename, ...CDN_VARIANT_WIDTHS.map((w) => variantKey(filename, w))] : [filename];
  const results = await Promise.all(keys.map((k) => client.fetch(url(k), { method: "DELETE" })));
  return results.every((res) => res.ok || res.status === 404);
}
