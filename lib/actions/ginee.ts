"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isGineeConfigured } from "@/lib/ginee/config";
import {
  searchGineeMasterProducts,
  summarizeGinee,
  getGineeProductDetail,
  getGineeVariationPrices,
  mapGineeFromBriefs,
  type GineeMasterProduct,
  type GineeVariationBrief,
} from "@/lib/ginee/products";
import { runGineeStockSync, getWarehouseStockBySku, type StockSyncResult } from "@/lib/ginee/sync";
import { getDefaultWarehouseId } from "@/lib/ginee/orders";
import { guessMerek } from "@/lib/brand-guess";
import { mirrorImages } from "@/lib/upload/mirror";

type SearchItem = ReturnType<typeof summarizeGinee> & {
  stock: number; // total stok GUDANG semua varian
  stockKnown: boolean; // false = stok gudang gagal diambil
  imported: boolean;
  variations: GineeVariationBrief[];
  productIds: string[]; // semua master Ginee yang digabung (nama sama); productIds[0] = productId
};
type SearchResult = { ok: true; total: number; items: SearchItem[] } | { ok: false; error: string };

/**
 * Pencarian Ginee cocok FRASA utuh ("snapfit fold 7" = 0 hasil walau ada "SNAPFIT … Fold 7").
 * ≥2 kata: cari potongan paling spesifik (total Ginee terkecil, mis. "fold 7"+"fold7"),
 * ambil maks. SCAN_PAGES×100 hasilnya, lalu saring agar SEMUA kata ada di nama. Hasil kata-per-kata
 * dikembalikan sekaligus di halaman 0 (total = jumlah cocok).
 */
const SCAN_PAGES = 5;
async function searchGineeByWords(keyword: string, page: number): Promise<{ total: number; content: GineeMasterProduct[] }> {
  const phrase = keyword.trim().replace(/\s+/g, " ");
  const words = phrase.toLowerCase().split(" ").filter(Boolean).slice(0, 6);
  // 1 kata: pencarian Ginee biasa (berhalaman). ≥2 kata: selalu per kata — frasa utuh Ginee bisa
  // memberi 1–2 hasil kebetulan ("fold 7 snapfit") dan menyembunyikan puluhan lainnya.
  if (words.length < 2) return searchGineeMasterProducts(phrase, page, 100);
  if (page > 0) return { total: 0, content: [] }; // semua hasil sudah dikirim di halaman 0
  const direct = await searchGineeMasterProducts(phrase, 0, 100).catch(() => ({ total: 0, content: [] as GineeMasterProduct[] }));

  // Kandidat pencarian ke Ginee (dipilih yang total hasilnya terkecil, >0):
  //  - kata tunggal ≥3 huruf ("snapfit", "fold")
  //  - kata pendek (≤2, mis. "7") TIDAK dicari sendiri — dipasangkan dgn kata sebelumnya, dalam dua
  //    ejaan yang dipakai di Ginee: "fold 7" & "fold7" (hasil keduanya digabung).
  // Pasangan dua kata panjang ("snapfit fold") tak dipakai: jarang berdampingan di nama → hasil terlalu sempit.
  const groups: string[][] = words.filter((w) => w.length >= 3).map((w) => [w]);
  words.forEach((w, i) => {
    if (w.length > 2) return;
    const other = i > 0 ? words[i - 1] : words[i + 1];
    if (!other) return;
    groups.push(i > 0 ? [`${other} ${w}`, `${other}${w}`] : [`${w} ${other}`, `${w}${other}`]);
  });
  if (!groups.length) return direct;
  const totals = await Promise.all(
    groups.map((g) =>
      Promise.all(g.map((c) => searchGineeMasterProducts(c, 0, 1).then((r) => r.total).catch(() => 0))),
    ),
  );
  const sum = totals.map((t) => t.reduce((a, b) => a + b, 0));
  // Ada kata/pasangan yang 0 hasil → mustahil semua kata cocok.
  if (sum.some((t) => t === 0)) return { total: 0, content: [] };
  const best = sum.indexOf(Math.min(...sum));

  const pool = new Map<string, GineeMasterProduct>(direct.content.map((p) => [p.productId, p]));
  for (const [j, cand] of groups[best].entries()) {
    const pages = Math.min(SCAN_PAGES, Math.ceil(totals[best][j] / 100));
    for (let pg = 0; pg < pages; pg++) {
      const r = await searchGineeMasterProducts(cand, pg, 100);
      for (const p of r.content) pool.set(p.productId, p);
      if (r.content.length < 100) break;
    }
  }
  // Kata pendek (mis. "7") dicocokkan per kata utuh ("Fold 7", bukan "17"), atau menempel pada
  // kata sebelumnya ("Fold7"). Kata lain cukup terkandung di nama.
  const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hits = [...pool.values()].filter((p) => {
    const n = p.name.toLowerCase();
    return words.every((w, i) => {
      if (w.length > 2) return n.includes(w);
      if (new RegExp(`(^|[^a-z0-9])${escape(w)}([^a-z0-9]|$)`).test(n)) return true;
      return i > 0 && n.includes(words[i - 1] + w);
    });
  });
  return { total: hits.length, content: hits };
}

export async function searchGineeForImport(keyword: string, page = 0): Promise<SearchResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Tidak diizinkan." };
  }
  if (!isGineeConfigured()) return { ok: false, error: "Ginee belum dikonfigurasi (isi GINEE_ACCESS_KEY/SECRET_KEY)." };
  if (!keyword.trim()) return { ok: false, error: "Masukkan kata kunci pencarian." };

  try {
    const { total, content } = await searchGineeByWords(keyword, page);
    // Ginee kadang punya BANYAK master produk bernama persis sama, masing-masing 1 varian
    // (mis. 23× "SNAPFIT Case … S26 … Acrylic"). Digabung jadi 1 baris = 1 produk web
    // dengan semua variannya.
    const existing = await db.product.findMany({
      where: { gineeProductId: { in: content.map((c) => c.productId) } },
      select: { gineeProductId: true },
    });
    const importedSet = new Set(existing.map((e) => e.gineeProductId));

    // Stok master Ginee selalu 0 — stok asli ada di INVENTORI GUDANG (sama dengan
    // impor & sinkron harian). Gagal ambil → stockKnown=false (tampil "stok ?").
    const skus = [...new Set(content.flatMap((c) => (c.variationBriefs ?? []).map((v) => v.sku)).filter(Boolean))];
    let warehouse: Map<string, { stock: number }> | null = null;
    try {
      const warehouseId = await getDefaultWarehouseId();
      if (warehouseId && skus.length) warehouse = await getWarehouseStockBySku(skus, warehouseId);
    } catch (e) {
      console.error("Stok gudang Ginee (pencarian impor) gagal:", e instanceof Error ? e.message : e);
    }

    const items: SearchItem[] = content.map((c) => {
      // variationBriefs dari search = sumber varian yang benar (terfilter per produk)
      const variations = (c.variationBriefs ?? []).map((v) => ({
        id: v.id,
        sku: v.sku,
        optionValues: v.optionValues ?? [],
        stock: warehouse?.get(v.sku)?.stock ?? 0,
      }));
      return {
        ...summarizeGinee(c),
        stock: variations.reduce((n, v) => n + (v.stock ?? 0), 0),
        stockKnown: warehouse !== null,
        imported: importedSet.has(c.productId),
        variations,
        productIds: [c.productId],
      };
    });
    return { ok: true, total, items: mergeSameName(items) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal mengambil data Ginee." };
  }
}

/** Gabungkan hasil bernama sama (spasi & huruf besar/kecil diabaikan) jadi satu item. */
function mergeSameName(items: SearchItem[]): SearchItem[] {
  const key = (n: string) => n.toLowerCase().replace(/\s+/g, " ").trim();
  const map = new Map<string, SearchItem>();
  for (const it of items) {
    const k = key(it.name);
    const g = map.get(k);
    if (!g) {
      map.set(k, { ...it, variations: [...it.variations], productIds: [...it.productIds] });
      continue;
    }
    const seen = new Set(g.variations.map((v) => v.id));
    g.variations.push(...it.variations.filter((v) => !seen.has(v.id)));
    g.productIds.push(...it.productIds);
    g.variantCount = g.variations.length;
    g.stock += it.stock;
    g.imported = g.imported || it.imported;
  }
  return [...map.values()];
}

type ImportInput = { productId: string; productIds?: string[]; name: string; variations: GineeVariationBrief[] };
type ImportResult = { ok: boolean; created: number; skipped: number; errors: string[] };

/**
 * Impor PENUH & "LANGSUNG SIAP JUAL" dari Ginee:
 *  - varian (variationBriefs search), foto & deskripsi (product detail)
 *  - harga = harga jual toko Shopee Snapfit Indonesia (placeholder → tersembunyi)
 *  - stok  = inventori GUDANG Ginee (bukan stok master yang selalu 0)
 *  - merek = ditebak dari judul (hanya merek terdaftar)
 *  - foto  = disalin ke cdn.snapfit.id (WebP), bukan hotlink marketplace
 * UI memanggil per 3 produk agar tak kena batas waktu.
 */
export async function importGineeProducts(inputs: ImportInput[]): Promise<ImportResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, created: 0, skipped: 0, errors: ["Tidak diizinkan."] };
  }
  if (!isGineeConfigured()) return { ok: false, created: 0, skipped: 0, errors: ["Ginee belum dikonfigurasi."] };
  if (!inputs.length) return { ok: false, created: 0, skipped: 0, errors: ["Tidak ada produk terpilih."] };

  const errors: string[] = [];
  let created = 0;
  let skipped = 0;
  const merekNames = (await db.merek.findMany({ select: { name: true } })).map((m) => m.name);
  const warehouseId = await getDefaultWarehouseId().catch(() => null);

  for (const input of inputs) {
    const label = input.name?.slice(0, 40) ?? input.productId;
    try {
      if (!input.variations?.length) {
        skipped++;
        errors.push(`"${label}": tanpa varian — dilewati.`);
        continue;
      }

      const priceMap = await getGineeVariationPrices(input.variations.map((v) => v.id));
      // Deskripsi & galeri opsional — jangan gagalkan produk kalau `get` kena limit.
      let detail = null;
      try {
        detail = await getGineeProductDetail(input.productId);
      } catch {
        /* lanjut tanpa deskripsi/galeri */
      }

      const mapped = mapGineeFromBriefs(input.productId, detail, input.variations, priceMap, input.name);
      if (!mapped) {
        skipped++;
        errors.push(`"${label}": tanpa foto — dilewati.`);
        continue;
      }

      // Sudah pernah diimpor (by gineeProductId, termasuk master lain dalam gabungan)?
      const ids = [...new Set([input.productId, ...(input.productIds ?? [])])];
      if (await db.product.findFirst({ where: { gineeProductId: { in: ids } }, select: { id: true } })) {
        skipped++;
        errors.push(`"${label}": sudah diimpor — dilewati.`);
        continue;
      }
      // Slug unik
      let slug = mapped.slug;
      if (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${slug}-${input.productId.slice(-6).toLowerCase()}`.slice(0, 90);
      }
      // SKU unik global
      const clash = await db.variant.findFirst({ where: { sku: { in: mapped.variants.map((v) => v.sku) } }, select: { sku: true } });
      if (clash) {
        skipped++;
        errors.push(`"${label}": SKU ${clash.sku} sudah ada — dilewati.`);
        continue;
      }

      // Stok dari gudang Ginee (stok master selalu 0).
      if (warehouseId) {
        try {
          const inv = await getWarehouseStockBySku(mapped.variants.map((v) => v.sku), warehouseId);
          for (const v of mapped.variants) {
            const row = inv.get(v.sku);
            if (row) v.stock = row.stock;
          }
        } catch (e) {
          errors.push(`"${label}": stok gudang gagal dibaca (${e instanceof Error ? e.message : "?"}) — stok 0, akan terisi saat sinkron harian.`);
        }
      }
      // Foto → CDN sendiri (gagal = tetap pakai URL asli).
      const mirror = await mirrorImages([mapped.coverImage, ...mapped.images, ...mapped.variants.map((v) => v.image)]);
      const cdn = (u: string) => mirror.get(u) ?? u;

      await db.product.create({
        data: {
          slug,
          name: mapped.name,
          brand: guessMerek(mapped.name, merekNames),
          description: mapped.description || null,
          coverImage: cdn(mapped.coverImage),
          images: mapped.images.map(cdn),
          variantGroups: mapped.variantGroups,
          gineeProductId: mapped.gineeProductId,
          variants: {
            create: mapped.variants.map((v) => ({
              name: v.name, color: v.color, type: v.type,
              sku: v.sku, price: v.price, stock: v.stock, weight: v.weight, image: cdn(v.image),
            })),
          },
        },
      });
      created++;
    } catch (e) {
      skipped++;
      errors.push(`"${label}": ${e instanceof Error ? e.message : "gagal"}.`);
    }
    // Jeda kecil antar-produk untuk hormati rate limit Ginee.
    await new Promise((r) => setTimeout(r, 200));
  }

  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidateTag(STOREFRONT_TAG);
  return { ok: created > 0, created, skipped, errors };
}

/** Sinkron stok Ginee → web untuk semua produk hasil impor (tombol admin). */
export async function syncGineeStock(): Promise<StockSyncResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, productsChecked: 0, stockUpdated: 0, priceUpdated: 0, errors: ["Tidak diizinkan."] };
  }
  const res = await runGineeStockSync();
  revalidatePath("/admin/produk");
  revalidatePath("/produk");
  revalidateTag(STOREFRONT_TAG);
  return res;
}
