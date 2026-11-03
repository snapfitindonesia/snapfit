// Pembaca .xlsx minimal (tanpa pustaka Excel): xlsx = zip berisi XML. Hanya nilai sel sebagai teks —
// cukup untuk file "Ubah Massal" Shopee (lib/shopee/mass-update.ts). Murni → bisa dipakai di browser & tes.
import { strFromU8, unzipSync } from "fflate";

export type Sheet = { name: string; rows: string[][] };

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

/** Gabungan semua <t> dalam satu potongan XML (string biasa maupun rich text). */
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");

const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

/** "AB12" → 27 (indeks kolom, mulai 0). */
function colIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** File unggahan: .xlsx langsung, atau .zip berisi beberapa .xlsx (Shopee memecah unduhan besar jadi 1.xlsx, 2.xlsx, …). */
export function readSpreadsheets(name: string, data: Uint8Array): { file: string; sheets: Sheet[] }[] {
  if (!/\.zip$/i.test(name)) return [{ file: name, sheets: readXlsx(data) }];
  const parts = unzipSync(data, { filter: (f) => /\.xlsx$/i.test(f.name) && !f.name.startsWith("__MACOSX/") });
  return Object.keys(parts)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((p) => ({ file: `${name} › ${p}`, sheets: readXlsx(parts[p]) }));
}

export function readXlsx(data: Uint8Array): Sheet[] {
  const files = unzipSync(data);
  const read = (p: string) => (files[p] ? strFromU8(files[p]) : "");

  const shared = [...read("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));

  // Nama sheet → file lewat relasi workbook.
  const rels = new Map(
    [...read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => [attr(m[0], "Id"), attr(m[0], "Target") ?? ""]),
  );
  const sheets: Sheet[] = [];
  for (const m of read("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = decode(attr(m[0], "name") ?? "");
    const target = rels.get(attr(m[0], "r:id")) ?? "";
    const path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
    const xml = read(path);
    if (!xml) continue;
    const rows: string[][] = [];
    for (const r of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
      const rowNum = Number(attr(r[0], "r")) || rows.length + 1;
      const row: string[] = [];
      let next = 0;
      for (const c of r[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = attr(` ${c[1]}`, "r");
        const i = ref ? colIndex(ref) : next;
        next = i + 1;
        const body = c[2] ?? "";
        const t = attr(` ${c[1]}`, "t");
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        row[i] = t === "s" ? (shared[Number(v)] ?? "") : t === "inlineStr" ? texts(body) : decode(v ?? "");
      }
      rows[rowNum - 1] = Array.from(row, (x) => x ?? "");
    }
    sheets.push({ name, rows: Array.from(rows, (x) => x ?? []) });
  }
  return sheets;
}
