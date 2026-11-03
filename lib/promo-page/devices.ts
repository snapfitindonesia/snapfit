// Perangkat dari JUDUL produk promo → menu /buy1get1 (merek → lini → model). Produk Buy 1 Get 1 (impor Shopee)
// umumnya tanpa kategori & untuk perangkat lama yang tak ada di pohon kategori (Fold 4, iPhone 13, …), jadi menu
// promo tak bisa bergantung pada Admin → Kategori. Murni (tanpa server) — dipakai menu (server) & tes.
import { slugify } from "@/lib/slug";

export type DeviceNode = { slug: string; name: string };
/** order: angka generasi (model lebih baru = lebih besar) untuk urutan menu. */
export type DeviceTag = { brand: DeviceNode; line: DeviceNode; model?: DeviceNode & { order: number } };

const node = (name: string): DeviceNode => ({ slug: slugify(name), name });
const tag = (brand: string, line: string, model?: string, order = 0): DeviceTag => ({
  brand: node(brand),
  // Lini bernama sama dgn merek (Xiaomi → "Xiaomi" 17/15T) butuh slug lain — slug merek mencakup Redmi/POCO juga.
  line: slugify(line) === slugify(brand) ? { slug: `${slugify(line)}-series`, name: line } : node(line),
  ...(model ? { model: { ...node(model), order } } : {}),
});

/** Semua perangkat yang disebut judul (mis. "iPad Pro 11 M2 … iPad Air 10.9" → iPad Pro & iPad Air). */
export function inferDevices(name: string): DeviceTag[] {
  const t = ` ${name.toLowerCase().replace(/[^a-z0-9.+]+/g, " ")} `;
  const out: DeviceTag[] = [];
  const all = (re: RegExp) => [...t.matchAll(re)];

  // --- Apple
  for (const m of all(/ iphone (\d{1,2}) /g)) out.push(tag("Apple", "iPhone", `iPhone ${m[1]}`, Number(m[1])));
  if (/ ipad /.test(t)) {
    const kinds = new Set<string>();
    if (/ ipad pro /.test(t)) kinds.add("iPad Pro");
    if (/ ipad air/.test(t)) kinds.add("iPad Air");
    if (/ ipad mini /.test(t)) kinds.add("iPad Mini");
    if (/ ipad (\d{1,2}|a\d{2}) /.test(t)) kinds.add("iPad");
    if (!kinds.size) kinds.add("iPad");
    for (const k of kinds) out.push(tag("Apple", "iPad", k));
  }
  if (/ macbook /.test(t)) out.push(tag("Apple", "MacBook", / macbook air /.test(t) ? "MacBook Air" : / macbook pro /.test(t) ? "MacBook Pro" : "MacBook"));
  if (/ airpods? /.test(t)) out.push(tag("Apple", "AirPods", / airpods? pro /.test(t) ? "AirPods Pro" : / airpods? max /.test(t) ? "AirPods Max" : "AirPods"));
  if (/ apple watch | iwatch /.test(t)) out.push(tag("Apple", "Apple Watch"));

  // --- Samsung ("Fold 4"/"Flip 5" juga tanpa kata Samsung; S/A/Tab hanya bila ada Samsung/Galaxy)
  const samsung = /samsung|galaxy/.test(t); // juga "CaseSamsung" (kata menempel)
  for (const m of all(/ (?:z )?fold ?(\d) /g)) if (!/ pixel | vivo | honor /.test(t)) out.push(tag("Samsung", "Galaxy Z Fold", `Galaxy Z Fold ${m[1]}`, Number(m[1])));
  for (const m of all(/ (?:z )?flip ?(\d) /g)) if (!/ pixel | vivo | honor /.test(t)) out.push(tag("Samsung", "Galaxy Z Flip", `Galaxy Z Flip ${m[1]}`, Number(m[1])));
  if (samsung) {
    for (const m of all(/ s(2\d) /g)) out.push(tag("Samsung", "Galaxy S", `Galaxy S${m[1]}`, Number(m[1])));
    for (const m of all(/ a(\d{2}) /g)) out.push(tag("Samsung", "Galaxy A", `Galaxy A${m[1]}`, Number(m[1])));
    for (const m of all(/ tab ([sa]\d+)/g)) out.push(tag("Samsung", "Galaxy Tab", `Galaxy Tab ${m[1].toUpperCase()}`));
  }

  // --- Xiaomi (Redmi Note sebelum Redmi)
  for (const m of all(/ redmi note (\d{1,2}) /g)) out.push(tag("Xiaomi", "Redmi Note", `Redmi Note ${m[1]}`, Number(m[1])));
  for (const m of all(/ redmi (\d{1,2}[a-z]?) /g)) out.push(tag("Xiaomi", "Redmi", `Redmi ${m[1].toUpperCase()}`, parseInt(m[1])));
  for (const m of all(/ poco ([a-z]?\d{1,2}[a-z]?) /g)) out.push(tag("Xiaomi", "POCO", `POCO ${m[1].toUpperCase()}`, parseInt(m[1].replace(/^\D/, ""))));
  for (const m of all(/ xiaomi (\d{1,2}t?) /g)) out.push(tag("Xiaomi", "Xiaomi", `Xiaomi ${m[1].toUpperCase()}`, parseInt(m[1])));

  // --- Lainnya: merek + seri huruf (Vivo V60, Oppo Reno 14, Pixel 10, …)
  for (const m of all(/ vivo ([a-z])(\d{1,3}) /g)) out.push(tag("Vivo", `Vivo ${m[1].toUpperCase()}`, `Vivo ${m[1].toUpperCase()}${m[2]}`, Number(m[2])));
  for (const m of all(/ oppo (reno|find x|a) ?(\d{1,2}) /g)) {
    const line = m[1] === "find x" ? "Find X" : m[1] === "reno" ? "Reno" : "A";
    out.push(tag("Oppo", `Oppo ${line}`, `Oppo ${line}${line === "A" ? "" : " "}${m[2]}`, Number(m[2])));
  }
  for (const m of all(/ pixel (\d{1,2}) /g)) out.push(tag("Google", "Pixel", `Pixel ${m[1]}`, Number(m[1])));

  // Satu perangkat sekali saja.
  const seen = new Set<string>();
  return out.filter((d) => {
    const k = `${d.line.slug}/${d.model?.slug ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Slug saringan (?kat=) untuk satu judul: merek, lini & model. */
export function deviceSlugs(name: string): string[] {
  return [...new Set(inferDevices(name).flatMap((d) => [d.brand.slug, d.line.slug, ...(d.model ? [d.model.slug] : [])]))];
}
