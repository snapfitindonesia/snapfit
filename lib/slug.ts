/** Slug URL dari nama (dipakai halaman /merek/[slug] — aman untuk client & server). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug produk (maks 80 karakter) — dipakai form admin, impor CSV & impor Ginee. */
export function productSlug(s: string): string {
  return slugify(s).slice(0, 80).replace(/-+$/, "");
}

/** SKU: huruf besar, alfanumerik + strip, maks 60 karakter. */
export function skuify(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/** Merek "placeholder" yang tidak punya halaman sendiri. */
export const HIDDEN_MEREK = new Set(["tidak-ada-merek", "tanpa-merek"]);

/** Link halaman merek; merek placeholder → daftar semua produk. */
export function merekHref(name: string): string {
  const slug = slugify(name);
  return HIDDEN_MEREK.has(slug) ? "/produk" : `/merek/${slug}`;
}
