// Konten beranda (gaya "bercerita" ala Nomad) — disimpan sebagai JSON di SiteSetting
// "home.sections", diedit di Admin → Tampilan Toko → Konten Beranda. File ini bebas DB
// (dipakai editor admin di browser & render di server).
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max).default("");
// URL gambar/tautan: kosong boleh; tautan internal ("/produk") atau https.
const link = z
  .string()
  .trim()
  .max(500)
  .default("")
  .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Tautan harus diawali / atau https://");
const img = link;
const theme = z.enum(["terang", "gelap"]).default("terang");
const color = z
  .string()
  .trim()
  .default("")
  .refine((v) => v === "" || /^#[0-9a-fA-F]{6}$/.test(v), "Warna harus format #RRGGBB");

const base = { id: z.string().min(1).max(40), active: z.boolean().default(true) };

const cta = { ctaLabel: text(40), ctaHref: link };

export const heroSchema = z.object({
  ...base,
  type: z.literal("hero"),
  // foto = foto penuh selebar layar + teks di atasnya; produk = latar warna + foto produk di samping
  mode: z.enum(["foto", "produk"]).default("produk"),
  image: img,
  imageMobile: img, // opsional: versi potrait untuk HP (mode foto)
  parallax: z.boolean().default(true), // mode foto: foto bergerak lebih lambat saat scroll
  bg: color,
  theme,
  eyebrow: text(60), // badge kecil (mis. "BARU")
  badgeBg: color, // warna badge (kosong = biru ala Nomad #005bd3)
  kicker: text(80), // subjudul tebal DI ATAS judul (mis. "Siap untuk iPhone 18")
  title: text(120),
  subtitle: text(240),
  ...cta,
});

export const productsSchema = z.object({
  ...base,
  type: z.literal("products"),
  title: text(80),
  subtitle: text(160),
  source: z.enum(["unggulan", "terbaru", "cari"]).default("terbaru"),
  query: text(80), // kata kunci bila source = cari (mis. "iphone 18")
  limit: z.number().int().min(4).max(16).default(10),
  ...cta,
});

const pill = z.object({ label: text(40), href: link, image: img });
export const categoriesSchema = z.object({
  ...base,
  type: z.literal("categories"),
  title: text(80),
  items: z.array(pill).max(8).default([]),
});

const feature = z.object({ image: img, eyebrow: text(40), title: text(80), text: text(300), ctaLabel: text(40), href: link });
export const featuresSchema = z.object({
  ...base,
  type: z.literal("features"),
  title: text(80),
  items: z.array(feature).max(6).default([]),
});

export const quoteSchema = z.object({
  ...base,
  type: z.literal("quote"),
  text: text(400),
  author: text(80),
});

export const bannerSchema = z.object({
  ...base,
  type: z.literal("banner"),
  image: img,
  imageMobile: img,
  parallax: z.boolean().default(true),
  bg: color,
  theme,
  eyebrow: text(60),
  title: text(120),
  text: text(300),
  ...cta,
});

const shot = z.object({ image: img, caption: text(60), href: link });
export const communitySchema = z.object({
  ...base,
  type: z.literal("community"),
  title: text(80),
  subtitle: text(160),
  // ulasan = foto dari ulasan pembeli (otomatis); manual = foto yang diunggah admin
  source: z.enum(["ulasan", "manual"]).default("ulasan"),
  items: z.array(shot).max(16).default([]),
});

export const reviewsSchema = z.object({
  ...base,
  type: z.literal("reviews"),
  image: img,
  bg: color,
  // {jumlah} & {rating} diganti angka asli dari ulasan pembeli. Tersembunyi bila belum ada ulasan.
  title: text(120),
  text: text(200),
  ...cta,
});

const card = z.object({ image: img, title: text(80), text: text(200), ctaLabel: text(40), href: link });
export const cardsSchema = z.object({
  ...base,
  type: z.literal("cards"),
  title: text(80),
  items: z.array(card).max(4).default([]),
});

// Blok Custom: admin menyusun sendiri 1–4 kolom (foto, judul, teks berformat ringan, tombol) +
// gaya (latar, warna teks, rata, jarak, gaya kartu). Teks: **tebal**, *miring*, [teks](tautan),
// baris diawali "- " = poin. Dirender aman (bukan HTML mentah) — lib/home/rich-text.tsx.
const customBlock = z.object({
  image: img,
  ratio: z.enum(["auto", "1:1", "4:5", "4:3", "16:9", "3:1"]).default("auto"),
  eyebrow: text(40),
  title: text(120),
  text: text(1200),
  ctaLabel: text(40),
  href: link,
});
export const customSchema = z.object({
  ...base,
  type: z.literal("custom"),
  title: text(120),
  subtitle: text(300),
  columns: z.enum(["1", "2", "3", "4"]).default("2"),
  width: z.enum(["normal", "full"]).default("normal"),
  align: z.enum(["left", "center"]).default("left"),
  bg: color,
  textColor: z.enum(["gelap", "terang"]).default("gelap"),
  spacing: z.enum(["sm", "md", "lg"]).default("md"),
  style: z.enum(["polos", "kartu"]).default("polos"),
  imageFirst: z.boolean().default(true), // 1 kolom: foto di atas (false = foto di samping kiri/kanan bergantian)
  mobileSlide: z.boolean().default(true), // ≥2 kolom: di HP jadi baris geser (slide), bukan tumpukan
  blocks: z.array(customBlock).max(8).default(() => [customBlock.parse({}), customBlock.parse({})]),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSchema,
  productsSchema,
  categoriesSchema,
  featuresSchema,
  quoteSchema,
  bannerSchema,
  communitySchema,
  reviewsSchema,
  cardsSchema,
  customSchema,
]);
export const sectionsSchema = z.array(sectionSchema).max(30);

export type HomeSection = z.infer<typeof sectionSchema>;
export type SectionType = HomeSection["type"];
export type SectionOf<T extends SectionType> = Extract<HomeSection, { type: T }>;

/** Nama & keterangan tiap jenis bagian (editor admin). */
export const SECTION_INFO: Record<SectionType, { label: string; hint: string; wide: boolean }> = {
  hero: { label: "Hero (paling atas)", hint: "Selebar layar. Mode foto: foto penuh + teks. Mode produk: latar warna + foto produk.", wide: true },
  products: { label: "Deretan produk", hint: "Produk bergeser ke samping: unggulan, terbaru, atau hasil kata kunci.", wide: false },
  categories: { label: "Pintasan kategori", hint: "Tombol bergambar ke kategori/perangkat.", wide: false },
  features: { label: "Gambar + teks bergantian", hint: "Blok cerita kiri-kanan bergantian (sorotan produk).", wide: false },
  quote: { label: "Kutipan", hint: "Kalimat pendek tentang brand.", wide: false },
  banner: { label: "Banner cerita", hint: "Selebar layar, foto atau warna polos + teks.", wide: true },
  community: { label: "Komunitas", hint: "Foto pelanggan bergeser ke samping. Tersembunyi bila belum ada foto.", wide: true },
  reviews: { label: "Banner ulasan", hint: "Angka ulasan asli. Tersembunyi bila belum ada ulasan.", wide: true },
  cards: { label: "Kartu info", hint: "2–4 kartu bergambar (Tentang, Garansi, dll).", wide: false },
  custom: { label: "Blok Custom", hint: "Susun sendiri: 1–4 kolom berisi foto, judul, teks, tombol + warna latar & gaya.", wide: false },
};

export const newId = () => Math.random().toString(36).slice(2, 10);

/** Bagian kosong per jenis (tombol "Tambah bagian" di admin). */
export function blankSection(type: SectionType): HomeSection {
  return sectionSchema.parse({ id: newId(), type });
}

/**
 * Isi bawaan (sebelum admin menyimpan apa pun). Teks = DRAF untuk direvisi client;
 * tanpa klaim angka/fakta yang belum pasti. Foto kosong → bagian tampil tanpa foto.
 */
export const DEFAULT_SECTIONS: HomeSection[] = sectionsSchema.parse([
  {
    id: "hero",
    // Gaya Nomad: foto gelap full-bleed di belakang header. Foto SEMENTARA (disusun dari foto
    // varian produk di latar cokelat gelap) — ganti dengan foto lifestyle di Admin → Konten Beranda.
    type: "hero",
    mode: "foto",
    theme: "gelap",
    bg: "#2b150d",
    image: "https://cdn.snapfit.id/1790611425803-25a347e7-7333-4760-a9b7-729a1f29c6fd-wide.webp",
    imageMobile: "https://cdn.snapfit.id/1790611171072-ae8284df-bb5b-4493-a0c4-8a8908b0f2b3-wide.webp",
    eyebrow: "BARU",
    kicker: "Siap untuk iPhone 18",
    title: "Pas Sejak Pertama Dipasang",
    ctaLabel: "Belanja Sekarang",
    ctaHref: "/produk?q=iphone%2018",
  },
  {
    id: "baru",
    type: "products",
    title: "Baru untuk iPhone 18",
    source: "cari",
    query: "iphone 18",
    limit: 10,
    ctaLabel: "Lihat semua",
    ctaHref: "/produk?q=iphone%2018",
  },
  {
    id: "kategori",
    type: "categories",
    title: "Belanja per perangkat",
    items: [
      { label: "iPhone", href: "/produk?q=iphone", image: "https://cdn.snapfit.id/m-ad86d79150d8ec25dec493cf.webp" },
      { label: "Galaxy S", href: "/produk?q=galaxy%20s", image: "https://cdn.snapfit.id/m-5587618d301fa0df2bef511b.webp" },
      { label: "Galaxy Z Fold", href: "/produk?q=fold", image: "https://cdn.snapfit.id/m-3258feb3c69d9532b647b0f3.webp" },
      { label: "Galaxy Z Flip", href: "/produk?q=flip", image: "https://cdn.snapfit.id/m-8ddc11cf808ca36c986be647.webp" },
      { label: "AirPods", href: "/produk?q=airpods", image: "https://cdn.snapfit.id/m-6879c8ce138a76b1e8b428ab.webp" },
    ],
  },
  {
    id: "sorotan",
    type: "features",
    items: [
      {
        image: "https://cdn.snapfit.id/m-aa73b31e0748da0af2664850.webp",
        eyebrow: "Baru",
        title: "Seri iPhone 18",
        text: "Dari case tipis magnetik sampai yang tahan banting — pilih yang paling cocok dengan caramu memakai HP.",
        ctaLabel: "Belanja iPhone 18",
        href: "/produk?q=iphone%2018",
      },
      {
        image: "https://cdn.snapfit.id/m-5962fe42f1470d8e6f49de95.webp",
        eyebrow: "Galaxy S26",
        title: "Case dan dompet dalam satu",
        text: "Case flip dengan slot kartu untuk Galaxy S26 series — kartu, uang, dan HP cukup satu genggaman.",
        ctaLabel: "Belanja Galaxy S26",
        href: "/produk?q=s26",
      },
      {
        image: "https://cdn.snapfit.id/m-6879c8ce138a76b1e8b428ab.webp",
        eyebrow: "AirPods",
        title: "Aman di saku, rapi di meja",
        text: "Case AirPods dengan gantungan kunci — tak lagi takut tergores atau tercecer.",
        ctaLabel: "Belanja case AirPods",
        href: "/produk?q=airpods",
      },
    ],
  },
  {
    id: "kutipan",
    type: "quote",
    text: "Aksesori yang baik tidak minta diperhatikan. Ia cukup pas, melindungi, dan tetap rapi dipakai setiap hari.",
    author: "Tim SNAPFIT",
  },
  {
    // Gaya "From the Nomad Community": foto bisa diklik → halaman produk. Isi awal = foto produk
    // yang tampak seperti foto asli; ganti dengan foto pelanggan/tim di Admin → Konten Beranda.
    id: "komunitas",
    type: "community",
    title: "SNAPFIT di Keseharian",
    source: "manual",
    items: [
      { image: "https://cdn.snapfit.id/m-8c596d6f7591923b5b4b1ead.webp", caption: "Case AirPods Pro 3 Carbon", href: "/produk/snapfit-case-compatible-for-airpods-pro-3-2025-airpods-4-2024-snapfit-real-arami" },
      { image: "https://cdn.snapfit.id/m-c2ad0a382604831c4b0d108b.webp", caption: "Case Vivo X300 Pro Matte", href: "/produk/snapfit-case-compatible-for-vivo-x300-pro-x300-snapfit-ultra-thin-matte-magsafe" },
      { image: "https://cdn.snapfit.id/m-6706eff7f93943e1f1868ef5.webp", caption: "Case AirPods 4 Aramid", href: "/produk/snapfit-case-compatible-for-airpods-pro-3-2025-airpods-4-2024-snapfit-real-arami" },
      { image: "https://cdn.snapfit.id/m-cd38360f4156f809c45f718c.webp", caption: "Case Pixel 10 MagSafe", href: "/produk/case-google-pixel-10-10-pro-pixel-10-pro-xl-snapfit-magnetic-magsafe-skin-feel-p" },
      { image: "https://cdn.snapfit.id/m-2e6d0dccdc7115a4b099da10.webp", caption: "Case Vivo X300 Ultra Thin", href: "/produk/snapfit-case-compatible-for-vivo-x300-pro-x300-snapfit-ultra-thin-matte-magsafe" },
      { image: "https://cdn.snapfit.id/m-ade9e92a2811c9a450b85ead.webp", caption: "Case AirPods 4 Security Lock", href: "/produk/snapfit-case-compatible-for-airpods-4-2024-snapfit-security-lock-military-shockp" },
      { image: "https://cdn.snapfit.id/m-775f8401eed54cdc412ebfb4.webp", caption: "Case Pixel 10 Leather Folio", href: "/produk/case-google-pixel-10-10-pro-google-pixel-10-pro-xl-snapfit-leather-folio-wallet" },
      { image: "https://cdn.snapfit.id/m-288f39e60738b55d8b1230dc.webp", caption: "Case AirPods Carbon Fiber", href: "/produk/snapfit-case-compatible-for-airpods-pro-3-2025-airpods-4-2024-snapfit-real-arami" },
      { image: "https://cdn.snapfit.id/m-7446f6fa6c861b861d17e547.webp", caption: "Case Pixel 10 Pro Frosted", href: "/produk/case-google-pixel-10-10-pro-pixel-10-pro-xl-snapfit-magnetic-magsafe-skin-feel-p" },
      { image: "https://cdn.snapfit.id/m-3c4ef31aee4f7b9d4efe526d.webp", caption: "Case Vivo X300 Slim", href: "/produk/snapfit-case-compatible-for-vivo-x300-pro-x300-snapfit-ultra-thin-matte-magsafe" },
    ],
  },
  {
    id: "cerita",
    type: "banner",
    bg: "#151515",
    theme: "gelap",
    eyebrow: "Kenapa SNAPFIT",
    title: "Presisi di setiap lekuk",
    text: "Potongan tombol, kamera, dan port mengikuti bentuk asli perangkatmu — pasang sekali, langsung pas.",
    ctaLabel: "Lihat koleksi",
    ctaHref: "/produk",
  },
  {
    id: "terbaru",
    type: "products",
    title: "Produk terbaru",
    source: "terbaru",
    limit: 12,
    ctaLabel: "Lihat semua",
    ctaHref: "/produk",
  },
  {
    id: "ulasan",
    type: "reviews",
    bg: "#151515",
    title: "{jumlah}+ ulasan bintang 5",
    text: "Dari pembeli SNAPFIT di seluruh Indonesia.",
    ctaLabel: "Belanja produk terlaris",
    ctaHref: "/produk",
  },
  {
    id: "kenali",
    type: "cards",
    title: "Kenali SNAPFIT",
    items: [
      { title: "Garansi & pengembalian", text: "Produk bergaransi resmi, 7 hari pengembalian bila tidak sesuai.", ctaLabel: "Selengkapnya", href: "/bantuan" },
      { title: "Butuh bantuan memilih?", text: "Tanya tipe HP-mu, kami bantu carikan yang pas.", ctaLabel: "Hubungi kami", href: "/bantuan" },
    ],
  },
]);
