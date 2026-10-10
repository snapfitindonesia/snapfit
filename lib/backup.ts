import { gzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { db } from "@/lib/db";

/**
 * Backup database harian → Cloudflare R2 (bucket PRIVAT terpisah, bukan bucket
 * foto publik — backup berisi data pelanggan). Format: JSON (semua tabel) di-gzip.
 * Restore: scripts/restore-backup.mjs.
 */
// v2 (Okt 2026): + siteSettings (konten beranda, warna, rekening transfer, bundle, overview),
// coinEntries (saldo koin member) & shippingZones (ongkir per provinsi) — dulu tak ikut di-backup.
export const BACKUP_VERSION = 2;
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
  const [products, reviews, variants, categories, mereks, banners, discounts, vouchers, orders, orderItems, bioProfiles, bioLinks, navLinks, emailOptOuts, articles, subscribers, siteSettings, coinEntries, shippingZones] =
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
      db.emailOptOut.findMany(), // permintaan berhenti pengingat (CheckoutDraft sengaja tidak — data sementara)
      db.article.findMany(),
      db.subscriber.findMany(),
      db.siteSetting.findMany(),
      db.coinEntry.findMany(),
      db.shippingZone.findMany(),
      // SearchTerm (statistik pencarian) & CheckoutDraft (keranjang sementara) sengaja tidak.
    ]);
  return {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    tables: { products, reviews, variants, categories, mereks, banners, discounts, vouchers, orders, orderItems, bioProfiles, bioLinks, navLinks, emailOptOuts, articles, subscribers, siteSettings, coinEntries, shippingZones },
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
  const cutoff = Date.now() - KEEP_DAYS * 86_400_000;
  const deleted: string[] = [];
  for (const b of await listBackups()) {
    if (b.date.getTime() < cutoff) {
      const del = await client.fetch(`${base}/${b.key}`, { method: "DELETE" });
      if (del.ok) deleted.push(b.key);
    }
  }

  const counts = Object.fromEntries(Object.entries(data.tables).map(([k, v]) => [k, v.length]));
  return { key, bytes: body.byteLength, counts, deleted };
}

/** Daftar file backup di R2 (tanggal dari nama file snapfit-YYYY-MM-DD.json.gz), terbaru dulu. */
export async function listBackups(): Promise<{ key: string; date: Date }[]> {
  const { base, client } = cfg();
  const res = await client.fetch(`${base}?list-type=2&prefix=${encodeURIComponent(PREFIX)}&max-keys=1000`);
  if (!res.ok) throw new Error(`Daftar backup gagal ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)]
    .flatMap((m) => {
      const d = m[1]!.match(/(\d{4}-\d{2}-\d{2})/)?.[1];
      return d ? [{ key: m[1]!, date: new Date(`${d}T00:00:00Z`) }] : [];
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Isi backup yang mencurigakan (mis. database terbaca kosong) → alasan; null = wajar. */
export function backupLooksWrong(counts: Record<string, number>): string | null {
  if (!counts.products) return "tabel produk kosong (0 baris)";
  if (!counts.variants) return "tabel varian kosong (0 baris)";
  return null;
}

/** Backup terbaru lebih tua dari `maxAgeHours` (atau tak ada sama sekali) → pesan; null = aman. */
// Backup jalan tiap hari 20:00 UTC; dicek 12:00 UTC (cron payment-reminder). Normal: ±12 jam sejak akhir hari
// backup terakhir. Satu hari terlewat → ±36 jam → di atas ambang 30 jam → admin diberi tahu.
export async function staleBackupWarning(maxAgeHours = 30, now = Date.now()): Promise<string | null> {
  const [latest] = await listBackups();
  return backupAgeWarning(latest, now, maxAgeHours);
}

export function backupAgeWarning(latest: { key: string; date: Date } | undefined, now: number, maxAgeHours = 30): string | null {
  if (!latest) return "Belum ada satu pun file backup di R2.";
  // Nama file hanya memuat tanggal (UTC) → anggap dibuat di akhir hari itu (paling longgar).
  const ageH = (now - (latest.date.getTime() + 86_400_000)) / 3_600_000;
  return ageH > maxAgeHours
    ? `Backup terbaru adalah ${latest.key} (tanggal ${latest.date.toISOString().slice(0, 10)}) — backup harian sepertinya berhenti.`
    : null;
}
