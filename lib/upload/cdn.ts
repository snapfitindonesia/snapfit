import sharp from "sharp";
import { Client as FtpClient } from "basic-ftp";
import { Readable } from "node:stream";

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

type CdnConfig = {
  host: string; user: string; password: string;
  port: number; secure: boolean; remoteDir: string; baseUrl: string;
};

export function cdnConfig(): CdnConfig | null {
  const host = process.env.FTP_HOST;
  const user = process.env.FTP_USER;
  const password = process.env.FTP_PASSWORD;
  const baseUrl = process.env.CDN_BASE_URL; // mis. https://cdn.snapfit.id
  if (!host || !user || !password || !baseUrl) return null;
  return {
    host, user, password, baseUrl: baseUrl.replace(/\/$/, ""),
    port: Number(process.env.FTP_PORT) || 21,
    secure: (process.env.FTP_SECURE ?? "true") !== "false",
    remoteDir: process.env.CDN_REMOTE_DIR || "/", // path folder cdn di server (mis. /public_html/cdn atau /)
  };
}

/** Upload buffer WebP ke cPanel via FTPS. Kembalikan public URL, atau null bila belum dikonfigurasi. */
export async function uploadToCdn(buffer: Buffer, filename: string): Promise<string | null> {
  const cfg = cdnConfig();
  if (!cfg) return null;

  const client = new FtpClient(20_000); // timeout 20s
  client.ftp.verbose = false;
  try {
    await client.access({
      host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password, secure: cfg.secure,
      secureOptions: { rejectUnauthorized: false }, // shared hosting kadang cert generic
    });
    if (cfg.remoteDir && cfg.remoteDir !== "/") await client.ensureDir(cfg.remoteDir);
    await client.uploadFrom(Readable.from(buffer), filename);
    return `${cfg.baseUrl}/${filename}`;
  } finally {
    client.close();
  }
}
