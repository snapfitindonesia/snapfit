// Impor ulasan ASLI TikTok Shop (file ekspor Seller Center: rating,review_text,review_date,order_id,product_id,sku_id)
// ke ulasan produk web. File ekspor tak memuat SKU web, jadi dicocokkan lewat Ginee:
//   (produk TikTok, variasi TikTok) → masterSku (item pesanan TikTok di Ginee) → Variant.sku web → produk.
// Variasi yang tak pernah muncul di pesanan Ginee: dipakai produk web yang sama bila SEMUA SKU produk TikTok itu
// mengarah ke satu produk web. Sisanya dilewati (produk belum ada di web, dll.) — dilaporkan.
//
// Ulasan disimpan: author "Pembeli TikTok Shop", tanggal asli, source "tiktok", externalId unik → impor ulang
// file yang sama/lebih baru TIDAK menggandakan. SEMUA rating diimpor (termasuk 1–3 bintang).
// Tampil berlabel "via TikTok Shop"; tidak dihitung di data terstruktur Google (lihat app/(shop)/produk/[slug]).
//
// Pakai:  npx tsx --conditions=react-server --env-file=.env scripts/import-tiktok-reviews.mts <file.csv>           (uji kering)
//         npx tsx --conditions=react-server --env-file=.env scripts/import-tiktok-reviews.mts <file.csv> --apply   (simpan)
// Hapus semua hasil impor (bila perlu):  DELETE FROM "Review" WHERE source = 'tiktok';
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { gineeRequest } from "@/lib/ginee/client";
import { parseCSV } from "@/lib/csv";

const csvPath = process.argv[2];
const apply = process.argv.includes("--apply");
if (!csvPath) {
  console.error("Pakai: scripts/import-tiktok-reviews.mts <file.csv> [--apply]");
  process.exit(2);
}

type Row = { rating: string; review_text: string; review_date: string; order_id: string; product_id: string; sku_id: string };
const grid = parseCSV(readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
const H = grid[0]!.map((h) => h.trim());
for (const need of ["rating", "review_text", "review_date", "order_id", "product_id", "sku_id"]) {
  if (!H.includes(need)) throw new Error(`Kolom "${need}" tidak ada — bukan file ekspor ulasan TikTok Shop?`);
}
const reviews = grid
  .slice(1)
  .filter((r) => r.length >= H.length)
  .map((r) => Object.fromEntries(H.map((h, i) => [h, (r[i] ?? "").trim()])) as Row)
  .filter((r) => /^[1-5]$/.test(r.rating) && r.product_id && r.order_id);
console.log(`Ulasan di file: ${reviews.length}${apply ? "" : "  (UJI KERING — tambahkan --apply untuk menyimpan)"}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 1) Semua pesanan TikTok di Ginee (toko TikTok dikenali dari pesanan 7 hari terakhir, semua kanal).
const shopSet = new Set<string>();
{
  let cursor: unknown;
  for (let page = 0; page < 20 && !shopSet.size; page++) {
    const res = await gineeRequest<{ content?: { channel: string; shopId: string }[]; more?: boolean; nextCursor?: unknown }>(
      "POST",
      "/openapi/order/v2/list-order",
      { size: 100, createSince: new Date(Date.now() - 7 * 86400_000).toISOString(), createTo: new Date().toISOString(), ...(cursor ? { nextCursor: cursor } : {}) },
    );
    for (const o of res.data?.content ?? []) if (/TIKTOK/i.test(o.channel)) shopSet.add(String(o.shopId));
    if (!res.data?.more || !res.data?.nextCursor) break;
    cursor = res.data.nextCursor;
  }
}
const shopIds = [...shopSet];
if (!shopIds.length) throw new Error("Toko TikTok tidak ditemukan di Ginee (7 hari terakhir).");

const ids = new Set<string>();
const oldest = reviews.map((r) => r.review_date).sort()[0] ?? "";
let from = new Date(new Date(oldest.replace(" ", "T") + "+07:00").getTime() - 30 * 86400_000);
if (Number.isNaN(from.getTime())) from = new Date(Date.now() - 365 * 86400_000);
while (from.getTime() < Date.now() - 1000) {
  const to = new Date(Math.min(from.getTime() + 13 * 86400_000, Date.now())); // jendela list-order Ginee ≤ 14 hari
  let cursor: unknown;
  for (let page = 0; page < 100; page++) {
    const res = await gineeRequest<{ content?: { orderId: string }[]; more?: boolean; nextCursor?: unknown }>("POST", "/openapi/order/v2/list-order", {
      size: 100,
      shopIdList: shopIds,
      createSince: from.toISOString(),
      createTo: to.toISOString(),
      ...(cursor ? { nextCursor: cursor } : {}),
    });
    if (String(res.code) !== "SUCCESS") throw new Error(`Ginee list-order: ${res.message ?? res.code}`);
    const list = res.data?.content ?? [];
    let fresh = 0;
    for (const o of list) {
      if (ids.has(o.orderId)) continue;
      ids.add(o.orderId);
      fresh++;
    }
    if (!res.data?.more || !res.data?.nextCursor || !fresh) break; // fresh 0 = Ginee mengulang halaman
    cursor = res.data.nextCursor;
    await sleep(80);
  }
  from = to;
}
console.log(`Pesanan TikTok di Ginee: ${ids.size}`);

// 2) Item pesanan → peta variasi/produk TikTok → masterSku.
type Item = { masterSku?: string; externalProductId?: string; externalVariationId?: string };
const byVar = new Map<string, string>();
const byProd = new Map<string, Set<string>>();
const all = [...ids];
for (let i = 0; i < all.length; i += 50) {
  const d = await gineeRequest<{ items?: Item[] }[]>("POST", "/openapi/order/v1/batch-get", { orderIds: all.slice(i, i + 50) });
  for (const o of d.data ?? []) {
    for (const it of o.items ?? []) {
      if (!it.masterSku || !it.externalProductId) continue;
      byVar.set(`${it.externalProductId}|${it.externalVariationId}`, it.masterSku);
      if (!byProd.has(it.externalProductId)) byProd.set(it.externalProductId, new Set());
      byProd.get(it.externalProductId)!.add(it.masterSku);
    }
  }
  await sleep(100);
}

// 3) masterSku → produk web, lalu simpan.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const variants = await db.variant.findMany({ where: { sku: { not: null } }, select: { sku: true, productId: true } });
const productOfSku = new Map(variants.map((v) => [v.sku!.trim().toUpperCase(), v.productId]));
const productOf = (sku?: string) => (sku ? productOfSku.get(sku.trim().toUpperCase()) : undefined);

const why: Record<string, number> = {};
const rows: { externalId: string; productId: string; rating: number; comment: string; createdAt: Date }[] = [];
for (const r of reviews) {
  let productId = productOf(byVar.get(`${r.product_id}|${r.sku_id}`));
  if (!productId) {
    const skus = byProd.get(r.product_id);
    const webIds = new Set([...(skus ?? [])].map((s) => productOf(s)).filter(Boolean));
    if (webIds.size === 1) productId = [...webIds][0];
  }
  const reason = productId ? "cocok" : byProd.has(r.product_id) ? "produk/variasi belum ada di web" : "produk tak ada di pesanan Ginee";
  why[reason] = (why[reason] ?? 0) + 1;
  if (!productId) continue;
  const createdAt = new Date(r.review_date.replace(" ", "T") + "+07:00");
  rows.push({
    externalId: `tiktok:${r.order_id}:${r.product_id}:${r.sku_id}`,
    productId,
    rating: Number(r.rating),
    comment: r.review_text.replace(/\r\n?/g, "\n").trim().slice(0, 2000),
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
  });
}
const existing = new Set(
  (await db.review.findMany({ where: { externalId: { in: rows.map((r) => r.externalId) } }, select: { externalId: true } })).map((r) => r.externalId),
);
const fresh = [...new Map(rows.filter((r) => !existing.has(r.externalId)).map((r) => [r.externalId, r])).values()];
console.log("Hasil pencocokan:", JSON.stringify(why));
console.log(`Ulasan baru: ${fresh.length} (sudah ada sebelumnya: ${existing.size}) untuk ${new Set(fresh.map((r) => r.productId)).size} produk`);

if (apply && fresh.length) {
  const res = await db.review.createMany({
    data: fresh.map((r) => ({ ...r, author: "Pembeli TikTok Shop", approved: true, verified: false, source: "tiktok" })),
  });
  console.log(`✓ Disimpan: ${res.count} ulasan. Halaman produk ikut segar ≤1 jam (atau redeploy).`);
}
await db.$disconnect();
