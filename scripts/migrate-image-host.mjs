// Ganti prefix URL gambar di seluruh database (mis. r2.dev → cdn.snapfit.id).
// File di bucket TIDAK dipindah — hanya alamat yang diganti (bucket R2 sama).
//
//   node scripts/migrate-image-host.mjs <dari> <ke>            → dry-run (hitung saja)
//   node scripts/migrate-image-host.mjs <dari> <ke> --apply    → tulis ke DB
import { PrismaClient } from "@prisma/client";

const [from, to] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const apply = process.argv.includes("--apply");
if (!from || !to) {
  console.error("Pakai: node scripts/migrate-image-host.mjs https://pub-xxx.r2.dev https://cdn.snapfit.id [--apply]");
  process.exit(1);
}

const db = new PrismaClient();
const swap = (v) => (typeof v === "string" && v.includes(from) ? v.split(from).join(to) : v);
let changed = 0;

async function col(model, fields) {
  const rows = await db[model].findMany({ select: { id: true, ...Object.fromEntries(fields.map((f) => [f, true])) } });
  for (const r of rows) {
    const data = {};
    for (const f of fields) {
      const v = r[f];
      if (Array.isArray(v)) {
        const nv = v.map(swap);
        if (JSON.stringify(nv) !== JSON.stringify(v)) data[f] = nv;
      } else if (swap(v) !== v) data[f] = swap(v);
    }
    if (Object.keys(data).length) {
      changed++;
      if (apply) await db[model].update({ where: { id: r.id }, data });
    }
  }
  console.log(`${model}: selesai`);
}

await col("product", ["coverImage", "images", "description"]);
await col("variant", ["image"]);
await col("banner", ["image"]);
await col("category", ["image"]);
await col("review", ["image"]);
await col("bioLink", ["image"]);
await col("bioProfile", ["avatar", "bgImage"]);

console.log(`${changed} baris ${apply ? "DIPERBARUI" : "akan diperbarui (dry-run, tambah --apply)"}`);
await db.$disconnect();
