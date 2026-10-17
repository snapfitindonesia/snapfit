// Edit Massal → Media (foto), mirip "Info Media" Shopee. Satu baris PRODUK (foto sampul + foto 2–9 = galeri)
// lalu satu baris per VARIASI (opsi pertama: warna, atau tipe bila produk tanpa warna) dengan foto variasinya.
// Logika murni (tanpa database) → dites di tests/bulk-media.test.ts.

export const GALLERY_MAX = 8; // foto 2–9 (form produk: maks 9 foto termasuk sampul)
export const MEDIA_HEADERS = [
  "productId",
  "jenis",
  "nama_produk",
  "variasi",
  "foto_sampul",
  ...Array.from({ length: GALLERY_MAX }, (_, i) => `foto_${i + 2}`),
  "foto_variasi",
] as const;

export type MediaVariant = { color: string; type: string; name: string; image: string | null };
export type MediaProduct = { id: string; name: string; coverImage: string; images: string[]; variants: MediaVariant[] };
export type MediaRow = Record<string, string>;

const hasColorDim = (vs: MediaVariant[]) => vs.some((v) => v.color.trim() !== "");
/** Nilai opsi pertama varian — sama dengan form produk (warna bila ada, selain itu tipe/nama). */
export const optionOf = (v: MediaVariant, hasColor: boolean) => (hasColor ? v.color.trim() : v.type.trim() || v.name.trim());

/** Baris CSV untuk diunduh. */
export function buildMediaRows(products: MediaProduct[]): MediaRow[] {
  const rows: MediaRow[] = [];
  for (const p of products) {
    const row: MediaRow = { productId: p.id, jenis: "produk", nama_produk: p.name, variasi: "", foto_sampul: p.coverImage, foto_variasi: "" };
    for (let i = 0; i < GALLERY_MAX; i++) row[`foto_${i + 2}`] = p.images[i] ?? "";
    rows.push(row);
    const hc = hasColorDim(p.variants);
    const seen = new Set<string>();
    for (const v of p.variants) {
      const opt = optionOf(v, hc);
      if (!opt || seen.has(opt)) continue;
      seen.add(opt);
      rows.push({ productId: p.id, jenis: "variasi", nama_produk: p.name, variasi: opt, foto_variasi: v.image ?? "" });
    }
  }
  return rows;
}

const XL_ERROR = /^#(NAME\?|VALUE!|REF!|N\/A|DIV\/0!|NUM!|NULL!|SPILL!)$/i;
const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?$)/i;

/** URL foto yang boleh dipakai: http(s) publik. Kembalikan URL rapi atau pesan error. */
export function checkImageUrl(raw: string): { url: string } | { error: string } {
  const s = raw.trim();
  if (XL_ERROR.test(s)) return { error: `sel berisi error Excel (${s})` };
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { error: `bukan alamat foto yang valid: ${s.slice(0, 60)}` };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { error: `alamat foto harus http(s): ${s.slice(0, 60)}` };
  if (PRIVATE_HOST.test(u.hostname)) return { error: "alamat foto tidak diizinkan" };
  return { url: s }; // apa adanya (bukan u.toString()) → URL lama yang sama tak dianggap berubah
}

export type ProductMediaUpdate = { productId: string; coverImage: string; images: string[] };
export type VariantMediaUpdate = { productId: string; option: string; image: string };
export type MediaPlan = { products: ProductMediaUpdate[]; variants: VariantMediaUpdate[]; errors: string[]; skipped: number };

/**
 * Bandingkan isi file dengan data sekarang → daftar perubahan. Aturan:
 *  - Baris produk: foto_sampul wajib terisi; foto_2–9 kosong = dihapus dari galeri (urutan mengikuti kolom).
 *    Kolom foto yang TIDAK ada di header file = tidak diubah.
 *  - Baris variasi: foto_variasi kosong = tidak diubah; terisi = semua varian dengan opsi itu memakai foto ini.
 *  - Sel error Excel / URL tak valid → baris dilewati (data asli aman).
 */
export function planMediaChanges(rows: MediaRow[], current: Map<string, MediaProduct>, headers: string[]): MediaPlan {
  const plan: MediaPlan = { products: [], variants: [], errors: [], skipped: 0 };
  const has = new Set(headers);
  const galleryCols = Array.from({ length: GALLERY_MAX }, (_, i) => `foto_${i + 2}`).filter((c) => has.has(c));
  rows.forEach((r, idx) => {
    const line = idx + 2; // baris 1 = header
    const pid = (r.productId ?? "").trim();
    if (!pid) return;
    const cur = current.get(pid);
    if (!cur) { plan.skipped++; plan.errors.push(`Baris ${line}: produk tidak ditemukan (mungkin sudah dihapus).`); return; }
    const jenis = (r.jenis ?? "").trim().toLowerCase();

    if (jenis === "produk") {
      if (!has.has("foto_sampul") && !galleryCols.length) return;
      let cover = cur.coverImage;
      if (has.has("foto_sampul")) {
        const raw = (r.foto_sampul ?? "").trim();
        if (!raw) { plan.skipped++; plan.errors.push(`Baris ${line} (${cur.name.slice(0, 40)}): foto_sampul wajib diisi.`); return; }
        const c = checkImageUrl(raw);
        if ("error" in c) { plan.skipped++; plan.errors.push(`Baris ${line}: foto_sampul ${c.error}.`); return; }
        cover = c.url;
      }
      let images = cur.images;
      if (galleryCols.length) {
        const next: string[] = [];
        for (const col of galleryCols) {
          const raw = (r[col] ?? "").trim();
          if (!raw) continue;
          const c = checkImageUrl(raw);
          if ("error" in c) { plan.skipped++; plan.errors.push(`Baris ${line}: ${col} ${c.error}.`); return; }
          next.push(c.url);
        }
        // Kolom galeri yang tak ada di file (mis. file lama tanpa foto_9) dipertahankan dari data sekarang.
        const untouched = cur.images.slice(galleryCols.length);
        images = galleryCols.length === GALLERY_MAX ? next : [...next, ...untouched];
      }
      const same = cover === cur.coverImage && images.length === cur.images.length && images.every((x, i) => x === cur.images[i]);
      if (!same) plan.products.push({ productId: pid, coverImage: cover, images });
      return;
    }

    if (jenis === "variasi") {
      if (!has.has("foto_variasi")) return;
      const raw = (r.foto_variasi ?? "").trim();
      if (!raw) return; // kosong = tidak diubah
      const option = (r.variasi ?? "").trim();
      const hc = hasColorDim(cur.variants);
      const matches = cur.variants.filter((v) => optionOf(v, hc) === option);
      if (!option || !matches.length) { plan.skipped++; plan.errors.push(`Baris ${line}: variasi "${option}" tidak ada di produk ini.`); return; }
      const c = checkImageUrl(raw);
      if ("error" in c) { plan.skipped++; plan.errors.push(`Baris ${line}: foto_variasi ${c.error}.`); return; }
      if (matches.some((v) => v.image !== c.url)) plan.variants.push({ productId: pid, option, image: c.url });
      return;
    }

    plan.skipped++;
    plan.errors.push(`Baris ${line}: kolom jenis harus "produk" atau "variasi".`);
  });
  return plan;
}
