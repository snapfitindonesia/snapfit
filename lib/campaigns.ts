// Kampanye promo berulang → halaman /promo/[slug]. Produknya = diskon (Admin → Diskon)
// yang diberi label kampanye ini; jadwal di sini hanya untuk info & hitung mundur.
// Murni (tanpa DB) → aman untuk client & server.

export const CAMPAIGN_SLUGS = ["payday-sale", "tanggal-kembar"] as const;
export type CampaignSlug = (typeof CAMPAIGN_SLUGS)[number];

export type Campaign = {
  slug: CampaignSlug;
  title: string;
  menuLabel: string;
  tagline: string;
  schedule: string; // teks jadwal untuk pembeli
  seoDescription: string;
};

export const CAMPAIGNS: Record<CampaignSlug, Campaign> = {
  "payday-sale": {
    slug: "payday-sale",
    title: "Payday Sale",
    menuLabel: "Payday Sale 🔥",
    tagline: "Gajian tiba — saatnya upgrade case & aksesori HP original dengan harga spesial.",
    schedule: "Setiap tanggal 25 sampai 28",
    seoDescription:
      "Payday Sale SNAPFIT: diskon gajian case HP, tempered glass & aksesori original Ringke, VRS Design, Araree, Supcase. Setiap tanggal 25–28.",
  },
  "tanggal-kembar": {
    slug: "tanggal-kembar",
    title: "Promo Tanggal Kembar",
    menuLabel: "Tanggal Kembar",
    tagline: "10.10, 11.11, 12.12 — diskon spesial hanya di tanggal kembar.",
    schedule: "Setiap tanggal kembar (mis. 10.10, 11.11, 12.12)",
    seoDescription:
      "Promo tanggal kembar SNAPFIT (10.10, 11.11, 12.12): diskon case HP & aksesori original dengan garansi resmi. Cek jadwal & produk promonya.",
  },
};

export const isCampaignSlug = (s: string): s is CampaignSlug => (CAMPAIGN_SLUGS as readonly string[]).includes(s);

/** 00:00 WIB (UTC+7) tanggal y-m-d (m = 1..12; hari/bulan berlebih dinormalkan Date). */
const wib = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, -7));

/** Tanggal/bulan/tahun "sekarang" menurut WIB. */
function wibParts(now: Date) {
  const t = new Date(now.getTime() + 7 * 3_600_000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export type CampaignWindow = { start: Date; end: Date; live: boolean };

/**
 * Jadwal kampanye yang sedang berjalan, atau berikutnya bila belum mulai.
 * - Payday: tgl 25 00:00 WIB s/d tgl 28 23:59 WIB.
 * - Tanggal kembar: tgl = bulan (1.1 … 12.12), 00:00–23:59 WIB.
 */
export function campaignWindow(slug: CampaignSlug, now = new Date()): CampaignWindow {
  const { y, m } = wibParts(now);
  const candidates: { start: Date; end: Date }[] = [];
  if (slug === "payday-sale") {
    for (const mm of [m - 1, m, m + 1]) candidates.push({ start: wib(y, mm, 25), end: wib(y, mm, 29) });
  } else {
    for (const yy of [y, y + 1]) for (let mm = 1; mm <= 12; mm++) candidates.push({ start: wib(yy, mm, mm), end: wib(yy, mm, mm + 1) });
  }
  const t = now.getTime();
  const w = candidates.find((c) => c.end.getTime() > t)!;
  return { ...w, live: w.start.getTime() <= t };
}

/** "10 Okt 2026" (WIB). */
export const fmtWibDate = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
