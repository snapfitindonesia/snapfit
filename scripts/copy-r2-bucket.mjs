// Salin SEMUA objek dari bucket R2 lama ke bucket R2 baru (beda akun Cloudflare).
// Kredensial dibaca dari env:
//   OLD_R2_ACCOUNT_ID / OLD_R2_ACCESS_KEY_ID / OLD_R2_SECRET_ACCESS_KEY / OLD_R2_BUCKET
//   NEW_R2_ACCOUNT_ID / NEW_R2_ACCESS_KEY_ID / NEW_R2_SECRET_ACCESS_KEY / NEW_R2_BUCKET
//   node scripts/copy-r2-bucket.mjs            → dry-run (daftar saja)
//   node scripts/copy-r2-bucket.mjs --apply    → salin (lewati yang sudah ada)
import { AwsClient } from "aws4fetch";

const apply = process.argv.includes("--apply");
const side = (p) => {
  const e = (k) => process.env[`${p}_R2_${k}`];
  if (!e("ACCOUNT_ID") || !e("ACCESS_KEY_ID") || !e("SECRET_ACCESS_KEY") || !e("BUCKET")) throw new Error(`Env ${p}_R2_* belum lengkap`);
  return {
    base: `https://${e("ACCOUNT_ID")}.r2.cloudflarestorage.com/${e("BUCKET")}`,
    client: new AwsClient({ accessKeyId: e("ACCESS_KEY_ID"), secretAccessKey: e("SECRET_ACCESS_KEY"), service: "s3", region: "auto" }),
  };
};
const src = side("OLD");
const dst = side("NEW");

async function listAll(s) {
  const keys = [];
  let token = "";
  do {
    const url = `${s.base}?list-type=2&max-keys=1000${token ? `&continuation-token=${encodeURIComponent(token)}` : ""}`;
    const res = await s.client.fetch(url);
    const xml = await res.text();
    if (!res.ok) throw new Error(`List ${res.status}: ${xml.slice(0, 200)}`);
    for (const m of xml.matchAll(/<Key>([^<]+)<\/Key>/g)) keys.push(m[1].replace(/&amp;/g, "&"));
    token = xml.match(/<NextContinuationToken>([^<]+)</)?.[1] ?? "";
  } while (token);
  return keys;
}

const [srcKeys, dstKeys] = await Promise.all([listAll(src), listAll(dst)]);
const have = new Set(dstKeys);
const todo = srcKeys.filter((k) => !have.has(k));
console.log(`lama: ${srcKeys.length} objek · baru: ${dstKeys.length} · perlu disalin: ${todo.length}`);
if (!apply) process.exit(0);

let ok = 0;
for (const key of todo) {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const get = await src.client.fetch(`${src.base}/${path}`);
  if (!get.ok) { console.error("GAGAL ambil", key, get.status); continue; }
  const body = new Uint8Array(await get.arrayBuffer());
  const put = await dst.client.fetch(`${dst.base}/${path}`, {
    method: "PUT",
    body,
    headers: {
      "Content-Type": get.headers.get("content-type") || "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Cache-Control": get.headers.get("cache-control") || "public, max-age=31536000, immutable",
    },
  });
  if (put.ok) ok++; else console.error("GAGAL simpan", key, put.status, (await put.text()).slice(0, 150));
}
console.log(`disalin: ${ok}/${todo.length}`);
