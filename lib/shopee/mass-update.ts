// File "Ubah Massal" Shopee Seller Center (Informasi Dasar / Penjualan / Media / Pengiriman) → produk siap impor.
// Murni (tanpa server) — dipakai halaman Admin → Impor Shopee di browser & tes.
//
// Susunan template Shopee bisa berubah, jadi kolom dikenali dari teks judulnya (baris kode internal
// "et_title_…" maupun label Indonesia "Kode Produk", "Nama Variasi", …), bukan dari posisinya. Baris data =
// baris yang kolom Kode Produk-nya berupa angka (baris petunjuk/contoh di atasnya terlewati).
import type { Sheet } from "@/lib/xlsx-read";

export type ShopeeVariant = {
  id: string; // Kode Variasi (model id); "" = produk tanpa variasi
  name: string; // "Dark Green,Free Case"
  options: string[]; // ["Dark Green", "Free Case"]
  sku: string;
  price: number;
  stock: number;
  image?: string;
};

export type ShopeeProduct = {
  id: string; // Kode Produk (item id)
  name: string;
  description: string;
  parentSku: string;
  images: string[]; // [0] = foto sampul
  weight?: number; // gram
  /** Nama variasi tingkat 1 di Shopee (mis. "Warna", "type") — dari file Media. */
  tierName?: string;
  variants: ShopeeVariant[];
};

type Field =
  | "ignore" | "optionImage" | "optionName" | "tierName"
  | "variationId" | "productId" | "variationName" | "name" | "description" | "parentSku" | "sku"
  | "price" | "stock" | "cover" | "variationImage" | "image" | "weight" | "option1" | "option2";

// Urutan penting: yang lebih spesifik dulu (mis. "kode variasi" sebelum "kode produk", "sku induk" sebelum "sku").
// Template Media: pasangan "et_title_option_N_for_variation_1" (nama opsi) + "…option_image_N…" (fotonya),
// "et_title_variation_1" = nama variasi tingkat 1.
const FIELDS: [Field, RegExp][] = [
  // Kolom yang mirip tapi bukan data produk (foto panduan ukuran, harga toko ekspor, ongkir, dll.).
  ["ignore", /size_?chart|panduan ukuran|categor|kategori|reason|alasan gagal|gtin|direct_listing|purchase_quantity|channel|length|width|height/],
  ["optionImage", /option_image_\d+_for_variation/],
  ["optionName", /option_\d+_for_variation/],
  ["tierName", /^et_title_variation_\d+$/],
  ["variationId", /variation_?id|model_?id|kode variasi|id variasi/],
  ["productId", /product_?id|item_?id|kode produk|id produk/],
  ["variationImage", /variation_?image|option_?image|foto variasi|gambar variasi/],
  ["option1", /variation_?(option|value)_?1|opsi variasi 1|nama opsi 1|^variasi 1$/],
  ["option2", /variation_?(option|value)_?2|opsi variasi 2|nama opsi 2|^variasi 2$/],
  ["variationName", /variation_?name|model_?name|nama variasi/],
  ["name", /product_?name|item_?name|nama produk/],
  ["description", /description|deskripsi/],
  ["parentSku", /parent_?sku|sku induk/],
  ["sku", /sku/],
  ["price", /price|harga/],
  ["stock", /stock|stok/],
  ["cover", /cover|sampul/],
  ["image", /image|foto|gambar/],
  ["weight", /weight|berat/],
];

/** Kenali kolom & baris awal data satu sheet. null = bukan sheet template (tak ada kolom Kode Produk). */
function layout(rows: string[][]): { cols: Map<Field, number[]>; start: number } | null {
  // Baris data pertama: kolom mana pun berisi id produk Shopee (angka ≥ 6 digit) setelah baris judul.
  for (let start = 1; start < Math.min(rows.length, 30); start++) {
    const header = rows.slice(0, start);
    const width = Math.max(...header.map((r) => r.length), 0);
    const cols = new Map<Field, number[]>();
    for (let c = 0; c < width; c++) {
      // Sel judul paling atas yang dikenali menang (kode "et_title_…" / label) — teks petunjuk di bawahnya
      // ("Masukkan harga…") tak boleh mengubah arti kolom.
      for (const t of header.map((r) => (r[c] ?? "").trim().toLowerCase()).filter(Boolean)) {
        const field = FIELDS.find(([, re]) => re.test(t))?.[0];
        if (!field) continue;
        cols.set(field, [...(cols.get(field) ?? []), c]);
        break;
      }
    }
    const pid = cols.get("productId")?.[0];
    if (pid === undefined) continue;
    if (/^\d{6,}$/.test((rows[start]?.[pid] ?? "").trim())) return { cols, start };
  }
  return null;
}

const num = (s: string | undefined) => {
  const n = Number(String(s ?? "").replace(/[^\d.,-]/g, "").replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Foto Shopee: URL utuh, atau hanya kode file → URL CDN Shopee. */
export function shopeeImageUrl(v: string): string {
  const s = v.trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9_-]{20,}$/i.test(s)) return `https://down-id.img.susercontent.com/file/${s}`;
  return "";
}

const splitOptions = (name: string) => name.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);

export type ParseResult = { products: ShopeeProduct[]; sheetsUsed: string[]; warnings: string[] };

/** Gabungkan isi beberapa file template (urutan bebas) per Kode Produk. */
export function parseShopeeMassUpdate(files: { file: string; sheets: Sheet[] }[]): ParseResult {
  const byId = new Map<string, ShopeeProduct>();
  const sheetsUsed: string[] = [];
  const warnings: string[] = [];
  const product = (id: string) => {
    let p = byId.get(id);
    if (!p) byId.set(id, (p = { id, name: "", description: "", parentSku: "", images: [], variants: [] }));
    return p;
  };
  // Foto & berat per variasi bisa datang sebelum file penjualan → simpan dulu.
  const variantImage = new Map<string, string>(); // `${productId}:${variationId|optionName}`
  const variantWeight = new Map<string, number>();

  for (const { file, sheets } of files) {
    let used = false;
    for (const sheet of sheets) {
      const lay = layout(sheet.rows);
      if (!lay) continue;
      used = true;
      sheetsUsed.push(`${file} › ${sheet.name}`);
      const { cols, start } = lay;
      const get = (row: string[], f: Field) => (cols.has(f) ? (row[cols.get(f)![0]] ?? "").trim() : "");
      const all = (row: string[], f: Field) => (cols.get(f) ?? []).map((c) => (row[c] ?? "").trim()).filter(Boolean);

      for (const row of sheet.rows.slice(start)) {
        const id = get(row, "productId");
        if (!/^\d{6,}$/.test(id)) continue;
        const p = product(id);
        const name = get(row, "name").replace(/\s+/g, " ");
        if (name && !p.name) p.name = name;
        const desc = get(row, "description");
        if (desc && !p.description) p.description = desc;
        const parentSku = get(row, "parentSku");
        if (parentSku && !p.parentSku) p.parentSku = parentSku;

        const vid = get(row, "variationId");
        const vname = get(row, "variationName") || [get(row, "option1"), get(row, "option2")].filter(Boolean).join(",");
        const vkey = `${id}:${vid || vname}`;

        // Foto produk (sampul dulu), tanpa duplikat.
        const imgs = [...all(row, "cover"), ...all(row, "image")].map(shopeeImageUrl).filter(Boolean);
        for (const u of imgs) if (!p.images.includes(u)) p.images.push(u);
        const vimg = shopeeImageUrl(get(row, "variationImage"));
        if (vimg && (vid || vname)) variantImage.set(vkey, vimg);
        // Template Media: foto per opsi variasi tingkat 1 (kolom berpasangan, urut).
        const optNames = (cols.get("optionName") ?? []).map((c) => (row[c] ?? "").trim());
        const optImgs = (cols.get("optionImage") ?? []).map((c) => shopeeImageUrl(row[c] ?? ""));
        optNames.forEach((o, i) => {
          if (o && optImgs[i]) variantImage.set(`${id}:${o}`, optImgs[i]);
        });
        const tier = get(row, "tierName");
        if (tier && !p.tierName) p.tierName = tier;

        const w = num(get(row, "weight"));
        if (w > 0) {
          if (vid || vname) variantWeight.set(vkey, w);
          if (!p.weight) p.weight = w;
        }

        // Baris penjualan (punya harga) = 1 variasi.
        if (cols.has("price") && get(row, "price")) {
          if (p.variants.some((v) => (vid ? v.id === vid : v.name === vname))) continue;
          p.variants.push({
            id: vid,
            name: vname,
            options: splitOptions(vname),
            sku: get(row, "sku") || (vid ? "" : parentSku),
            price: Math.round(num(get(row, "price"))),
            stock: Math.max(0, Math.round(num(get(row, "stock")))),
          });
        }
      }
    }
    if (!used) warnings.push(`${file}: tidak dikenali sebagai template Ubah Massal Shopee.`);
  }

  for (const p of byId.values()) {
    for (const v of p.variants) {
      v.image =
        variantImage.get(`${p.id}:${v.id}`) ??
        variantImage.get(`${p.id}:${v.name}`) ??
        // Foto per opsi pertama (mis. foto per warna).
        variantImage.get(`${p.id}:${v.options[0] ?? ""}`);
    }
    const w = p.variants.map((v) => variantWeight.get(`${p.id}:${v.id || v.name}`)).find(Boolean);
    if (!p.weight && w) p.weight = w;
  }
  const products = [...byId.values()].filter((p) => p.name);
  return { products, sheetsUsed, warnings };
}

/** Berat dari template Shopee ("Berat Produk/g"); kosong → 200 g. */
export const weightGrams = (w?: number) => (w && w > 0 ? Math.round(w) : 200);
