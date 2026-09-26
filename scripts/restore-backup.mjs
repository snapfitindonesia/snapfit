// Kembalikan data dari backup harian (lib/backup.ts).
//
//   node --env-file=.env scripts/restore-backup.mjs                 → daftar backup di R2
//   node --env-file=.env scripts/restore-backup.mjs 2026-09-26      → dry-run: bandingkan backup vs DB
//   node --env-file=.env scripts/restore-backup.mjs 2026-09-26 --apply
//        → TAMBAHKAN KEMBALI baris yang hilang (tidak menimpa/menghapus data yang ada)
//   (argumen bisa juga path file lokal .json.gz)
//
// Untuk memulihkan nilai yang TERUBAH (bukan terhapus), unduh file lalu ambil
// datanya manual — skrip ini sengaja tidak menimpa data.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { PrismaClient, Prisma } from "@prisma/client";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const target = args.find((a) => !a.startsWith("--"));

const e = process.env;
const bucket = e.BACKUP_R2_BUCKET || "snapfit-backup";
const base = `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${bucket}`;
const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });

if (!target) {
  const res = await client.fetch(`${base}?list-type=2&prefix=db/&max-keys=1000`);
  const xml = await res.text();
  if (!res.ok) throw new Error(`List ${res.status}: ${xml.slice(0, 200)}`);
  const rows = [...xml.matchAll(/<Key>([^<]+)<\/Key>[\s\S]*?<Size>(\d+)<\/Size>/g)];
  console.log(rows.length ? rows.map((m) => `${m[1]}  ${(+m[2] / 1024).toFixed(0)} KB`).join("\n") : "Belum ada backup.");
  process.exit(0);
}

let gz;
if (/^\d{4}-\d{2}-\d{2}$/.test(target)) {
  const res = await client.fetch(`${base}/db/snapfit-${target}.json.gz`);
  if (!res.ok) throw new Error(`Backup ${target} tidak ditemukan (${res.status})`);
  gz = Buffer.from(await res.arrayBuffer());
  writeFileSync(`snapfit-${target}.json.gz`, gz); // salinan lokal (gitignored)
  console.log(`Diunduh → snapfit-${target}.json.gz`);
} else {
  gz = readFileSync(target);
}
const backup = JSON.parse(gunzipSync(gz).toString("utf8"));
const T = backup.tables;
console.log(`Backup dibuat ${backup.createdAt} (v${backup.version})`);

const db = new PrismaClient();

// Kolom Json nullable: null harus dikirim sebagai Prisma.DbNull.
const jsonFields = Object.fromEntries(
  Prisma.dmmf.datamodel.models.map((m) => [m.name, m.fields.filter((f) => f.type === "Json").map((f) => f.name)]),
);
const clean = (model, row) => {
  const out = { ...row };
  for (const f of jsonFields[model] ?? []) if (out[f] === null) out[f] = Prisma.DbNull;
  return out;
};

// Kategori self-referensi: induk dulu.
const byId = new Map(T.categories.map((c) => [c.id, c]));
const depth = (c) => (c.parentId && byId.has(c.parentId) ? 1 + depth(byId.get(c.parentId)) : 0);
const categories = [...T.categories].sort((a, b) => depth(a) - depth(b));

const plan = [
  ["Category", "category", categories],
  ["Merek", "merek", T.mereks],
  ["Product", "product", T.products.map(({ extraCategories, ...p }) => p)],
  ["Variant", "variant", T.variants],
  ["Review", "review", T.reviews],
  ["Discount", "discount", T.discounts.map(({ variants, ...d }) => d)],
  ["Voucher", "voucher", T.vouchers],
  ["Order", "order", T.orders],
  ["OrderItem", "orderItem", T.orderItems],
  ["Banner", "banner", T.banners],
  ["NavLink", "navLink", T.navLinks],
  ["BioProfile", "bioProfile", T.bioProfiles],
  ["BioLink", "bioLink", T.bioLinks],
];

let totalMissing = 0;
for (const [model, key, rows] of plan) {
  const existing = new Set((await db[key].findMany({ select: { id: true } })).map((r) => r.id));
  const missing = rows.filter((r) => !existing.has(r.id));
  totalMissing += missing.length;
  console.log(`${model.padEnd(11)} backup ${String(rows.length).padStart(5)} · DB ${String(existing.size).padStart(5)} · hilang ${missing.length}`);
  if (apply && missing.length) {
    if (model === "Category") {
      for (const r of missing) await db.category.create({ data: clean(model, r) }); // urut induk dulu
    } else {
      await db[key].createMany({ data: missing.map((r) => clean(model, r)), skipDuplicates: true });
    }
  }
}

// Relasi m-n (kategori tambahan produk, varian diskon) — sambungkan ulang yang hilang.
if (apply) {
  for (const p of T.products) {
    if (!p.extraCategories?.length) continue;
    await db.product
      .update({ where: { id: p.id }, data: { extraCategories: { connect: p.extraCategories.map((c) => ({ id: c.id })) } } })
      .catch(() => {});
  }
  for (const d of T.discounts) {
    if (!d.variants?.length) continue;
    await db.discount
      .update({ where: { id: d.id }, data: { variants: { connect: d.variants.map((v) => ({ id: v.id })) } } })
      .catch(() => {});
  }
}

console.log(apply ? `Selesai: ${totalMissing} baris dikembalikan.` : `Dry-run: ${totalMissing} baris akan dikembalikan (tambah --apply).`);
await db.$disconnect();
