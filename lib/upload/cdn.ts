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

/** Upload buffer WebP ke Cloudflare R2. Kembalikan public URL, atau null bila belum dikonfigurasi. */
export async function uploadToR2(buffer: Buffer, filename: string): Promise<string | null> {
  const cfg = r2Config();
  if (!cfg) return null;
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${filename}`;
  const body = new Uint8Array(buffer);
  const res = await client.fetch(endpoint, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(body.byteLength), // R2 wajib (runtime Vercel tak auto-isi)
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!res.ok) throw new Error(`R2 ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 200));
  return `${cfg.publicUrl}/${filename}`;
}

/** Hapus objek dari Cloudflare R2. True bila sukses / memang tak ada (404). */
export async function deleteFromR2(filename: string): Promise<boolean> {
  const cfg = r2Config();
  if (!cfg) return false;
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const endpoint = `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${filename}`;
  const res = await client.fetch(endpoint, { method: "DELETE" });
  return res.ok || res.status === 404;
}
