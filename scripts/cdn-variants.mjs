// Varian ukuran foto di bucket R2 (cdn.snapfit.id): tiap `x.webp` punya
// `x.w128.webp`, `x.w384.webp` & `x.w750.webp` — dipakai lib/image-loader.ts (foto dimuat langsung
// dari CDN tanpa kuota Vercel, tapi tetap kecil di HP). Upload baru otomatis membuat
// varian (lib/upload/cdn.ts); skrip ini untuk file lama + verifikasi.
//
//   node --env-file=.env scripts/cdn-variants.mjs           → hitung & verifikasi (dry-run)
//   node --env-file=.env scripts/cdn-variants.mjs --apply   → buat varian yang belum ada
//   … --prune-old --apply                                    → + hapus varian lebar lama
//
// Selalu diakhiri pengecekan: setiap URL cdn di DB harus punya file asli + semua varian.
// SAMAKAN lebar & kualitas dengan lib/upload/cdn.ts.
import sharp from "sharp";
import { AwsClient } from "aws4fetch";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const WIDTHS = [128, 384, 750];
const apply = process.argv.includes("--apply");
const e = process.env;
const PUBLIC = (e.R2_PUBLIC_URL || "https://cdn.snapfit.id").replace(/\/$/, "");
const base = `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${e.R2_BUCKET || "snapfit"}`;
const client = new AwsClient({ accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY, service: "s3", region: "auto" });

const variantKey = (key, w) => key.replace(/\.webp$/, `.w${w}.webp`);
const isBase = (key) => /^[^/]+\.webp$/.test(key) && !/\.w\d+\.webp$/.test(key);

async function listKeys() {
  const keys = new Set();
  let token = "";
  do {
    const res = await client.fetch(`${base}?list-type=2&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`);
    const xml = await res.text();
    if (!res.ok) throw new Error(`List ${res.status}: ${xml.slice(0, 200)}`);
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.add(m[1]);
    token = xml.match(/<NextContinuationToken>([^<]+)</)?.[1] ?? "";
  } while (token);
  return keys;
}

let keys = await listKeys();
const bases = [...keys].filter(isBase);
const todo = bases.flatMap((k) => WIDTHS.filter((w) => !keys.has(variantKey(k, w))).map((w) => [k, w]));
console.log(`objek: ${keys.size} · foto WebP asli: ${bases.length} · varian belum ada: ${todo.length}`);

if (apply && todo.length) {
  // Kelompokkan per file asli → unduh sekali, buat semua varian yang kurang.
  const byKey = new Map();
  for (const [k, w] of todo) byKey.set(k, [...(byKey.get(k) ?? []), w]);
  const jobs = [...byKey.entries()];
  let i = 0, done = 0, failed = 0, bytes = 0;
  const failures = [];
  async function worker() {
    while (i < jobs.length) {
      const [k, widths] = jobs[i++];
      try {
        const res = await client.fetch(`${base}/${k}`);
        if (!res.ok) throw new Error(`GET ${res.status}`);
        const src = Buffer.from(await res.arrayBuffer());
        for (const w of widths) {
          const out = await sharp(src).resize({ width: w, height: w, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();
          const body = new Uint8Array(out);
          const put = await client.fetch(`${base}/${variantKey(k, w)}`, {
            method: "PUT",
            body,
            headers: { "Content-Type": "image/webp", "Content-Length": String(body.byteLength), "Cache-Control": "public, max-age=31536000, immutable" },
          });
          if (!put.ok) throw new Error(`PUT ${put.status}`);
          bytes += out.length;
        }
        done++;
      } catch (err) {
        failed++;
        failures.push(`${k} (${err.message})`);
      }
      if ((done + failed) % 200 === 0) console.log(`… ${done + failed}/${jobs.length}`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  console.log(`varian dibuat untuk ${done} foto (${(bytes / 1048576).toFixed(1)} MB) · gagal: ${failed}`);
  if (failures.length) console.log("GAGAL:\n" + failures.slice(0, 20).join("\n"));
  keys = await listKeys();
}

// ---- --prune-old: hapus varian lebar lama (bukan di WIDTHS). Jalankan HANYA setelah
// loader yang memakai WIDTHS baru sudah live, agar halaman tak merujuk file terhapus. ----
if (process.argv.includes("--prune-old")) {
  const old = [...keys].filter((k) => {
    const m = k.match(/\.w(\d+)\.webp$/);
    return m && !WIDTHS.includes(Number(m[1]));
  });
  console.log(`varian lama: ${old.length}${apply ? " — menghapus…" : " (tambah --apply untuk menghapus)"}`);
  if (apply && old.length) {
    let i = 0, gone = 0;
    async function del() {
      while (i < old.length) {
        const k = old[i++];
        const res = await client.fetch(`${base}/${k}`, { method: "DELETE" });
        if (res.ok || res.status === 404) gone++;
      }
    }
    await Promise.all(Array.from({ length: 8 }, del));
    console.log(`varian lama dihapus: ${gone}/${old.length}`);
    keys = await listKeys();
  }
}

// ---- Verifikasi: semua URL cdn yang dipakai DB lengkap (asli + varian) ----
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const IMG_IN_HTML = /<img[^>]+src=["']([^"']+)["']/gi;
const refs = new Set();
const add = (u) => { if (typeof u === "string" && u.startsWith(`${PUBLIC}/`)) refs.add(u); };
for (const p of await db.product.findMany({ select: { coverImage: true, images: true, description: true } })) {
  add(p.coverImage);
  if (Array.isArray(p.images)) p.images.forEach(add);
  for (const m of (p.description ?? "").matchAll(IMG_IN_HTML)) add(m[1]);
}
for (const v of await db.variant.findMany({ select: { image: true } })) add(v.image);
for (const r of await db.review.findMany({ select: { image: true, photo: true } })) { add(r.image); add(r.photo); }
for (const c of await db.category.findMany({ select: { image: true } })) add(c.image);
for (const b of await db.banner.findMany({ select: { image: true } })) add(b.image);
for (const b of await db.bioProfile.findMany({ select: { avatar: true, bgImage: true } })) { add(b.avatar); add(b.bgImage); }
for (const b of await db.bioLink.findMany({ select: { image: true } })) add(b.image);
await db.$disconnect();

const problems = [];
for (const u of refs) {
  const k = decodeURIComponent(new URL(u).pathname.slice(1));
  if (!keys.has(k)) problems.push(`HILANG asli: ${k}`);
  else if (isBase(k)) for (const w of WIDTHS) if (!keys.has(variantKey(k, w))) problems.push(`HILANG w${w}: ${k}`);
}
console.log(`URL cdn dipakai DB: ${refs.size} · bermasalah: ${problems.length}`);
if (problems.length) console.log(problems.slice(0, 30).join("\n"));
process.exitCode = problems.length ? 1 : 0;
