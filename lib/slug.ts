/** Slug URL dari nama (dipakai halaman /merek/[slug] — aman untuk client & server). */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Merek "placeholder" yang tidak punya halaman sendiri. */
export const HIDDEN_MEREK = new Set(["tidak-ada-merek", "tanpa-merek"]);

/** Link halaman merek; merek placeholder → daftar semua produk. */
export function merekHref(name: string): string {
  const slug = slugify(name);
  return HIDDEN_MEREK.has(slug) ? "/produk" : `/merek/${slug}`;
}
