// Bangun data wilayah (Provinsi → Kabupaten/Kota → Kecamatan) untuk dropdown checkout.
// Sumber: wilayah.id (kode resmi Kepmendagri). Jalankan ulang bila ada pemekaran:
//
//   node scripts/build-wilayah.mjs
//
// Hasil:
//   lib/wilayah/provinces.json   → daftar 38 provinsi (dipakai client & validasi server)
//   public/wilayah/<kode>.json   → 1 file per provinsi: kab/kota + kecamatannya (diunduh saat dipilih)
import fs from "node:fs";

const BASE = "https://wilayah.id/api";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${BASE}/${path}`, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`${res.status}`);
      return (await res.json()).data;
    } catch (e) {
      if (attempt >= 4) throw new Error(`${path}: ${e.message}`);
      await sleep(1000 * attempt);
    }
  }
}

const provinces = await get("provinces.json");
if (provinces.length < 38) throw new Error(`provinsi hanya ${provinces.length}`);
fs.mkdirSync("public/wilayah", { recursive: true });
fs.mkdirSync("lib/wilayah", { recursive: true });

let regTotal = 0, distTotal = 0;
for (const p of provinces) {
  const regencies = await get(`regencies/${p.code}.json`);
  const r = [];
  for (const reg of regencies) {
    const districts = await get(`districts/${reg.code}.json`);
    r.push({ c: reg.code, n: reg.name, d: districts.map((d) => [d.code, d.name]) });
    distTotal += districts.length;
    await sleep(80); // sopan terhadap server sumber
  }
  regTotal += r.length;
  fs.writeFileSync(`public/wilayah/${p.code}.json`, JSON.stringify({ c: p.code, n: p.name, r }));
  console.log(`${p.code} ${p.name}: ${r.length} kab/kota`);
}
fs.writeFileSync("lib/wilayah/provinces.json", JSON.stringify(provinces.map((p) => ({ code: p.code, name: p.name }))));
console.log(`SELESAI: ${provinces.length} provinsi · ${regTotal} kab/kota · ${distTotal} kecamatan`);
