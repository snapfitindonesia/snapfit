// Saringan produk DI DALAM halaman /buy1get1 (menu, pencarian & "Lihat semua" tak keluar ke katalog utama).
// Tautan menu berbentuk "?kat=<slug kategori>&q=<kata>" — dibaca di browser (halaman tetap statis/ISR).
// Tanpa import server: dipakai lib/promo-page/menu.ts (server) & components/promo-page (client).

export type PromoFilter = { kat?: string; q?: string };
/** Data saring per produk promo: slug kategori (utama, tambahan & induknya) + teks pencarian (huruf kecil). */
export type PromoItemMeta = { id: string; slugs: string[]; text: string };

export function filterHref(f: PromoFilter): string {
  const p = new URLSearchParams();
  if (f.kat) p.set("kat", f.kat);
  if (f.q?.trim()) p.set("q", f.q.trim());
  const s = p.toString();
  return s ? `?${s}` : "?";
}

export function parseFilter(search: string): PromoFilter {
  const p = new URLSearchParams(search);
  const kat = p.get("kat")?.trim() || undefined;
  const q = p.get("q")?.trim() || undefined;
  return { kat, q };
}

/** Per kata (seperti pencarian katalog): "case s25" cocok dgn "SNAPFIT Case … Galaxy S25". */
export function matchesFilter(item: Pick<PromoItemMeta, "slugs" | "text">, f: PromoFilter): boolean {
  if (f.kat && !item.slugs.includes(f.kat)) return false;
  const terms = (f.q ?? "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  return terms.every((t) => item.text.includes(t));
}
