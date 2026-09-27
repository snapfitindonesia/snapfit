// Jenis produk & kunci tipe HP — murni (tanpa DB), aman untuk client & server.
// Dipakai rekomendasi "Lengkapi dengan" di PDP (lib/cross-sell.ts).

export type ProductKind = "case" | "glass" | "lens" | "other";

// Jenis = kata kunci yang muncul PALING AWAL di nama. Nama marketplace sering
// menyebut aksesori lain, mis. "Case … Include Tempered Glass" (tetap case) atau
// "Lens Protector … Frame Glass" (pelindung kamera, bukan tempered glass layar).
// "glass" = pelindung layar (tempered glass & hydrogel). Pelindung punggung &
// tombol kamera sengaja "other" — bukan pelengkap yang relevan untuk case.
const RULES: [ProductKind, RegExp][] = [
  ["case", /\b(case|casing)\b/i],
  ["glass", /\btempered\b|\bscreen protector\b|\bhydrogel\b/i],
  ["lens", /\blens\b/i],
  ["other", /\bcamera control\b|\bback (glass|protector)\b/i],
];

export function productKind(name: string): ProductKind {
  let best: ProductKind = "other";
  let pos = Infinity;
  for (const [kind, re] of RULES) {
    const m = re.exec(name);
    if (m && m.index < pos) {
      pos = m.index;
      best = kind;
    }
  }
  return best;
}

/** Pasangan pelengkap per jenis (urutan = prioritas tampil). */
export const COMPANION_KINDS: Record<ProductKind, ProductKind[]> = {
  case: ["glass", "lens"],
  glass: ["case"],
  lens: ["case"],
  other: [],
};

/**
 * Kunci tipe HP dari opsi varian, untuk mencocokkan antar produk:
 * "Z Fold 8 (Wide)", "Fold8 Wide", "Samsung Galaxy Z Fold 8 Wide" → "fold8wide".
 * Null bila bukan tipe HP (tanpa angka, mis. "Blue") — jangan dicocokkan.
 */
export function typeKey(raw: string | null | undefined): string | null {
  let s = (raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  s = s.replace(/^(samsung)?(galaxy)?/, "").replace(/^z(?=fold|flip)/, "");
  return /\d/.test(s) && s.length >= 3 ? s : null;
}
