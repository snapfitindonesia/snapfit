// Salin foto produk yang masih hotlink ke marketplace (Shopee/TikTok/Tokopedia/…)
// ke bucket R2 kita (cdn.snapfit.id), dikompres WebP ≤1200px q80.
// Nama file deterministik: m-<sha1(url)>.webp → aman diulang (lanjut dari yang gagal).
//
//   node --env-file=.env scripts/mirror-marketplace-images.mjs            → dry-run (hitung)
//   node --env-file=.env scripts/mirror-marketplace-images.mjs --upload   → unduh+kompres+unggah
//   node --env-file=.env scripts/mirror-marketplace-images.mjs --rewrite  → ganti URL di DB
//        (hanya URL yang file-nya SUDAH ada di bucket)
import { createHash } from "node:crypto";
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { PrismaClient } from "@prisma/client";

const upload = process.argv.includes("--upload");
const rewrite = process.argv.includes("--rewrite");
const e = process.env;
const PUBLIC = (e.R2_PUBLIC_URL || "https://cdn.snapfit.id").replace(/\/$/, "");
const base = `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${e.R2_BUCKET || "snapfit"}`;
const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });

const OURS = [PUBLIC, "r2.dev", "supabase.co"];
const isExternal = (u) => /^https?:\/\//.test(u) && !OURS.some((o) => u.includes(o));
const keyFor = (u) => `m-${createHash("sha1").update(u).digest("hex").slice(0, 24)}.webp`;
const IMG_IN_HTML = /<img[^>]+src=["']([^"']+)["']/gi;

const db = new PrismaClient();
const products = await db.product.findMany({ select: { id: true, coverImage: true, images: true, description: true } });
const variants = await db.variant.findMany({ select: { id: true, image: true } });

const urls = new Set();
for (const p of products) {
  for (const u of [p.coverImage, ...(Array.isArray(p.images) ? p.images : [])]) if (u && isExternal(u)) urls.add(u);
  for (const m of (p.description ?? "").matchAll(IMG_IN_HTML)) if (isExternal(m[1])) urls.add(m[1]);
}
for (const v of variants) if (v.image && isExternal(v.image)) urls.add(v.image);

async function listKeys() {
  const keys = new Set();
  let token = "";
  do {
    const res = await client.fetch(`${base}?list-type=2&prefix=m-&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`);
    const xml = await res.text();
    if (!res.ok) throw new Error(`List ${res.status}: ${xml.slice(0, 200)}`);
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.add(m[1]);
    token = xml.match(/<NextContinuationToken>([^<]+)</)?.[1] ?? "";
  } while (token);
  return keys;
}

const have = await listKeys();
const todo = [...urls].filter((u) => !have.has(keyFor(u)));
console.log(`foto eksternal: ${urls.size} · sudah di CDN: ${urls.size - todo.length} · belum: ${todo.length}`);

if (upload && todo.length) {
  let done = 0, failed = 0, bytesIn = 0, bytesOut = 0;
  const failures = [];
  let i = 0;
  async function worker() {
    while (i < todo.length) {
      const u = todo[i++];
      try {
        const res = await fetch(u, { signal: AbortSignal.timeout(30000), headers: { "User-Agent": "Mozilla/5.0 (SNAPFIT image mirror)" } });
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const src = Buffer.from(await res.arrayBuffer());
        const out = await sharp(src).rotate().resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
        const body = new Uint8Array(out);
        const put = await client.fetch(`${base}/${keyFor(u)}`, {
          method: "PUT",
          body,
          headers: { "Content-Type": "image/webp", "Content-Length": String(body.byteLength), "Cache-Control": "public, max-age=31536000, immutable" },
        });
        if (!put.ok) throw new Error(`PUT ${put.status}`);
        bytesIn += src.length; bytesOut += out.length; done++;
      } catch (err) {
        failed++; failures.push(`${u}  (${err.message})`);
      }
      if ((done + failed) % 100 === 0) console.log(`… ${done + failed}/${todo.length}`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`diunggah: ${done} · gagal: ${failed} · ukuran ${(bytesIn / 1048576).toFixed(1)} MB → ${(bytesOut / 1048576).toFixed(1)} MB`);
  if (failures.length) console.log("GAGAL:\n" + failures.slice(0, 20).join("\n"));
}

if (rewrite) {
  const ready = await listKeys();
  const swap = (u) => (u && isExternal(u) && ready.has(keyFor(u)) ? `${PUBLIC}/${keyFor(u)}` : u);
  let rows = 0;
  for (const p of products) {
    const images = Array.isArray(p.images) ? p.images.map(swap) : p.images;
    const description = p.description?.replace(IMG_IN_HTML, (tag, src) => tag.replace(src, swap(src)));
    const data = {};
    if (swap(p.coverImage) !== p.coverImage) data.coverImage = swap(p.coverImage);
    if (JSON.stringify(images) !== JSON.stringify(p.images)) data.images = images;
    if (description !== p.description) data.description = description;
    if (Object.keys(data).length) { await db.product.update({ where: { id: p.id }, data }); rows++; }
  }
  for (const v of variants) {
    if (swap(v.image) !== v.image) { await db.variant.update({ where: { id: v.id }, data: { image: swap(v.image) } }); rows++; }
  }
  console.log(`URL diganti di ${rows} baris DB.`);
}

await db.$disconnect();
