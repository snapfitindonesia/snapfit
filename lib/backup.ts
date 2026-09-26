import { gzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { db } from "@/lib/db";

/**
 * Backup database harian → Cloudflare R2 (bucket PRIVAT terpisah, bukan bucket
 * foto publik — backup berisi data pelanggan). Format: JSON (semua tabel) di-gzip.
 * Restore: scripts/restore-backup.mjs.
 */
export const BACKUP_VERSION = 1;
const PREFIX = "db/";
const KEEP_DAYS = 30;

function cfg() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.BACKUP_R2_BUCKET || "snapfit-backup";
  if (!accountId || !accessKeyId || !secretAccessKey) throw new Error("R2 belum dikonfigurasi");
  return {
    base: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" }),
  };
}

/** Ekspor semua tabel (+ id relasi m-n) ke satu objek. */
export async function exportDatabase() {
  const [products, reviews, variants, categories, mereks, banners, discounts, vouchers, orders, orderItems, bioProfiles, bioLinks, navLinks] =
    await Promise.all([
      db.product.findMany({ include: { extraCategories: { select: { id: true } } } }),
      db.review.findMany(),
      db.variant.findMany(),
      db.category.findMany(),
      db.merek.findMany(),
      db.banner.findMany(),
      db.discount.findMany({ include: { variants: { select: { id: true } } } }),
      db.voucher.findMany(),
      db.order.findMany(),
      db.orderItem.findMany(),
      db.bioProfile.findMany(),
      db.bioLink.findMany(),
      db.navLink.findMany(),
    ]);
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables: { products, reviews, variants, categories, mereks, banners, discounts, vouchers, orders, orderItems, bioProfiles, bioLinks, navLinks },
  };
}

/** Buat backup, unggah ke R2, hapus backup > 30 hari. */
export async function runBackup() {
  const { base, client } = cfg();
  const data = await exportDatabase();
  const gz = gzipSync(Buffer.from(JSON.stringify(data)));
  const body = new Uint8Array(gz);
  const day = data.createdAt.slice(0, 10);
  const key = `${PREFIX}snapfit-${day}.json.gz`;

  const put = await client.fetch(`${base}/${key}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": "application/gzip", "Content-Length": String(body.byteLength) },
  });
  if (!put.ok) throw new Error(`Upload backup gagal ${put.status}: ${(await put.text()).slice(0, 200)}`);

  // Rotasi: hapus file lebih tua dari KEEP_DAYS.
  const list = await client.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(PREFIX)}&max-keys=1000`);
  const xml = await list.text();
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const deleted: string[] = [];
  for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) {
    const d = m[1].match(/(\d{4}-\d{2}-\d{2})/)?.[1];
    if (d && new Date(d).getTime() < cutoff) {
      const del = await client.fetch(`${base}/${m[1]}`, { method: "DELETE" });
      if (del.ok) deleted.push(m[1]);
    }
  }

  const counts = Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.length]));
  return { key, bytes: body.byteLength, counts, deleted };
}
