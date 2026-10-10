// Format CSV Edit Massal (Admin → Katalog → Edit Massal) — murni, dipakai komponen admin & tes (tests/csv.test.ts).

// Pemisah kolom file unduhan: titik koma — Excel berbahasa Indonesia langsung membukanya sebagai
// tabel (pemisah daftar Windows ID = ";"). Upload menerima ; , atau Tab (dideteksi dari baris judul),
// jadi file yang disimpan ulang dari Excel/Google Sheets mana pun tetap terbaca.
export const SEP = ";";

// Bungkus sel bila mengandung pemisah/kutip/baris baru.
export function cell(v: string | number): string {
  let s = String(v ?? "");
  // Teks diawali = + - @ dianggap RUMUS oleh Excel (jadi "#NAME?" lalu menimpa data saat diupload ulang).
  // Awali dengan Tab: tak terlihat di Excel, sel tetap teks, dan terbuang otomatis saat upload (nilai di-trim).
  if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `\t${s}`;
  return /[";,\n\t]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Pemisah dari baris judul: yang paling sering muncul di antara ; , dan Tab. */
export function detectSep(text: string): string {
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => first.split(ch).length - 1;
  return [";", ",", "\t"].sort((a, b) => count(b) - count(a))[0]!;
}

export function parseCSV(input: string): string[][] {
  // Buang BOM & baris "sep=;" (penanda pemisah gaya Excel) bila ada.
  let text = input.replace(/^﻿/, "");
  const sepLine = text.match(/^sep=(.)\r?\n/i);
  const sep = sepLine ? sepLine[1]! : detectSep(text);
  if (sepLine) text = text.slice(sepLine[0].length);
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

