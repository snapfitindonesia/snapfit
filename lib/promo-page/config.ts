// Halaman promo /buy1get1 (desain paket "FashionPage", components/promo-page) — isi & susunan diatur di
// Admin → Halaman Buy 1 Get 1, disimpan di SiteSetting PROMO_PAGE_KEY. File ini tanpa import server
// (dipakai editor admin di browser & halaman).
import { z } from "zod";

export const PROMO_PAGE_KEY = "page.buy1get1";
export const PROMO_PAGE_TAG = "promo-page-buy1get1";
export const PROMO_PAGE_PATH = "/buy1get1";

/** Bagian halaman yang bisa diurutkan & disembunyikan (seperti Konten Beranda). */
// Bagian "categories" (kartu merek), "editorial" & "brands" (kotak pilihan) dihapus Nov 2026 — data lama yang
// masih memuatnya tetap terbaca (diabaikan di parsePromoPage).
export const SECTION_KEYS = ["hero", "arrivals", "products", "signup", "benefits", "seo"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];
export const SECTION_LABELS: Record<SectionKey, { label: string; hint: string }> = {
  hero: { label: "Banner utama", hint: "Foto besar paling atas — 1280 × 720 px" },
  arrivals: { label: "Banner strip", hint: "Banner tipis selebar layar — 1920 × 300 px" },
  products: { label: "Produk promo", hint: "Produk peserta Buy 1 Get 1 (dipilih di bagian Produk promo)" },
  signup: { label: "Ajakan langganan", hint: "Kotak ajakan daftar newsletter" },
  benefits: { label: "Keunggulan", hint: "3 poin keunggulan belanja" },
  seo: { label: "Teks SEO", hint: "Paragraf deskripsi di bawah halaman" },
};

const text = (max: number) => z.string().trim().max(max).default("");
const href = z
  .string()
  .trim()
  .max(500)
  .default("")
  // "/…" halaman situs, "https://…" situs lain, "#id" bagian di halaman ini (mis. #produk-promo).
  // "//evil.com" (tanpa skema) & "javascript:" ditolak.
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https?:\/\//i.test(v) || /^#[a-z0-9-]+$/i.test(v), "Tautan harus diawali /, https:// atau #");
const img = z.string().trim().max(1000).default("");

const banner = z.object({ image: img, alt: text(160), href });

export const promoPageSchema = z.object({
  title: text(120), // judul tab browser & SEO
  description: text(300),
  appBanner: z.object({ show: z.boolean().default(true), text: text(120), ctaLabel: text(30), href }),
  utility: z.object({ badge: text(4), text: text(80), note: text(40), href, rightText: text(120), rightHref: href }),
  searchPlaceholder: text(80),
  sections: z.array(z.object({ key: z.enum(SECTION_KEYS), active: z.boolean() })).max(SECTION_KEYS.length),
  hero: banner,
  arrivals: banner,
  products: z.object({
    eyebrow: text(60),
    title: text(120),
    caption: text(160),
    productIds: z.array(z.string().max(40)).max(48).default([]),
    /** Potongan Buy 1 Get 1 otomatis di keranjang & checkout untuk produk di atas (lib/b1g1.ts). */
    promoActive: z.boolean().default(true),
    /** "Hanya di halaman promo": tak tampil di daftar/kategori/pencarian/beranda/sitemap/feed (lib/promo-page/promo.ts).
     *  Halaman produknya tetap bisa dibuka dari /buy1get1 (pilih varian & beli), dengan noindex. */
    hiddenIds: z.array(z.string().max(40)).max(48).default([]),
  }),
  /** Foto per merek perangkat di mega menu (410 × 490 px); kosong = sampul seri pertama, lalu placeholder. */
  categories: z.object({ images: z.record(z.string().max(80), img).default({}) }).default({ images: {} }),
  signup: z.object({ eyebrow: text(60), title: text(120), text: text(240), ctaLabel: text(40) }),
  benefits: z.array(z.object({ title: text(60), caption: text(100) })).max(3).default([]),
  seo: z.object({ title: text(120), text: text(1200), more: text(1200) }),
  footer: z.object({ tagline: text(160), bottomLeft: text(60), bottomRight: text(80) }),
});
export type PromoPageConfig = z.infer<typeof promoPageSchema>;

/** Placeholder abu-abu bertuliskan ukuran ideal (data URI SVG — tanpa file/CDN). */
export function placeholder(w: number, h: number, label = ""): string {
  const fs = Math.max(14, Math.round(Math.min(w, h) / 12));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#ecebe8"/>` +
    `<text x="50%" y="50%" fill="#9a9893" font-family="Arial,sans-serif" font-size="${fs}" text-anchor="middle" dominant-baseline="middle">` +
    `${label ? `${label} · ` : ""}${w} × ${h}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Ukuran tiap slot gambar (sama dengan atribut width/height di komponen paket). */
export const SLOT_SIZE = {
  hero: [1280, 720],
  arrivals: [1920, 300],
  category: [410, 490],
} as const;

export const DEFAULT_PROMO_PAGE: PromoPageConfig = {
  title: "Buy 1 Get 1 — SNAPFIT",
  description: "Promo Buy 1 Get 1 SNAPFIT: beli 1 aksesori, gratis 1. Case, tempered glass & pelindung kamera presisi untuk HP-mu.",
  appBanner: { show: true, text: "Promo Buy 1 Get 1 — beli 1 gratis 1 untuk produk pilihan", ctaLabel: "Lihat", href: "#produk-promo" },
  utility: { badge: "7", text: "Hari Pengembalian", note: "S&K berlaku", href: "/bantuan#pengembalian", rightText: "Buy 1 Get 1 — produk pilihan, gratis 1", rightHref: "#produk-promo" },
  searchPlaceholder: "Cari case, tempered glass, tipe HP…",
  sections: SECTION_KEYS.map((key) => ({ key, active: true })),
  hero: { image: "", alt: "Promo Buy 1 Get 1 SNAPFIT", href: "#produk-promo" },
  arrivals: { image: "", alt: "Produk terbaru SNAPFIT", href: "/produk" },
  products: { eyebrow: "BUY 1 GET 1", title: "Beli 1, gratis 1.", caption: "Masukkan 2 produk promo ke keranjang — yang lebih murah gratis.", productIds: [], promoActive: true, hiddenIds: [] },
  categories: { images: {} },
  signup: { eyebrow: "A LITTLE SOMETHING FOR YOU", title: "Promo baru, langsung ke emailmu.", text: "Dapatkan info promo & produk terbaru SNAPFIT.", ctaLabel: "Daftar newsletter" },
  benefits: [
    { title: "100% original", caption: "Produk resmi SNAPFIT & bergaransi" },
    { title: "Belanja makin mudah", caption: "Dikirim ke seluruh Indonesia" },
    { title: "7 hari pengembalian", caption: "Untuk produk cacat atau salah kirim" },
  ],
  seo: {
    title: "Promo Buy 1 Get 1 SNAPFIT",
    text: "SNAPFIT adalah merek pelindung layar, pelindung kamera, dan casing smartphone presisi asal Indonesia. Selama promo, beli 1 produk pilihan dan dapatkan 1 gratis.",
    more: "Promo berlaku untuk produk berlabel Buy 1 Get 1 di halaman ini. Produk gratis adalah yang harganya lebih rendah, dihitung otomatis di keranjang.",
  },
  footer: { tagline: "Aksesori presisi untuk HP & tablet.", bottomLeft: "SNAPFIT Indonesia", bottomRight: "Pas sejak pertama dipasang." },
};

/** Gabungkan data tersimpan dengan bawaan (data lama/rusak → bawaan per bagian). */
export function parsePromoPage(raw: unknown): PromoPageConfig {
  // Bagian yang sudah dihapus dari kode (mis. "brands") dibuang dulu — kalau tidak, seluruh pengaturan ditolak skema.
  const known = new Set<string>(SECTION_KEYS);
  const input =
    raw && typeof raw === "object" && Array.isArray((raw as { sections?: unknown }).sections)
      ? { ...raw, sections: ((raw as { sections: { key?: unknown }[] }).sections).filter((s) => known.has(String(s?.key))) }
      : raw;
  const r = promoPageSchema.safeParse(input);
  if (!r.success) return DEFAULT_PROMO_PAGE;
  const c = r.data;
  // Bagian baru (versi kode lebih baru) ditambahkan di akhir, tersembunyi.
  const seen = new Set(c.sections.map((s) => s.key));
  const sections = [...c.sections, ...SECTION_KEYS.filter((k) => !seen.has(k)).map((key) => ({ key, active: false }))];
  return {
    ...c,
    sections,
    benefits: c.benefits.length ? c.benefits : DEFAULT_PROMO_PAGE.benefits,
  };
}
