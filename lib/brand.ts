// Identitas merek SNAPFIT untuk mesin pencari & AI (Google, Gemini/AI Overviews, ChatGPT, dll.):
// satu entitas Organization (toko) + Brand (merek) dengan @id tetap, ditautkan ke akun resmi lewat `sameAs`
// (diisi dari Admin → Links, model BioProfile) → semua channel dikenali sebagai milik merek yang sama.
// Dipakai di beranda, /tentang, halaman produk (brand SNAPFIT) & artikel (publisher).
import { db } from "@/lib/db";
import { storefrontCached } from "@/lib/storefront-cache";
import { STORE_WA_DISPLAY } from "@/lib/contact";

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");
export const ORG_ID = `${SITE}/#organization`;
export const BRAND_ID = `${SITE}/#brand`;

export const BRAND_NAME = "SNAPFIT";
/** Definisi tegas (proper noun) — sama di footer, /tentang & data terstruktur. */
export const BRAND_DEFINITION =
  "SNAPFIT adalah merek pelindung layar, pelindung kamera, dan casing smartphone presisi asal Indonesia.";
export const BRAND_SUMMARY =
  "Case HP, tempered glass, pelindung lensa kamera & aksesori untuk iPhone, Samsung Galaxy, Xiaomi, Vivo, iPad, MacBook, hingga konsol genggam — dibuat pas per tipe perangkat.";

export type OfficialProfile = { label: string; url: string };

/** Akun & toko resmi dari Admin → Links (hanya URL http(s) yang terisi). */
export const getOfficialProfiles = storefrontCached("official-profiles", [] as OfficialProfile[], async () => {
  const bio = await db.bioProfile.findUnique({ where: { id: "main" } });
  const list: [string, string | null | undefined][] = [
    ["Shopee", bio?.shopee],
    ["Tokopedia", bio?.tokopedia],
    ["TikTok", bio?.tiktok],
    ["Instagram", bio?.instagram],
    ["Facebook", bio?.facebook],
    ["YouTube", bio?.youtube],
  ];
  return list.flatMap(([label, url]) => (url && /^https?:\/\//i.test(url.trim()) ? [{ label, url: url.trim() }] : []));
});

/** Brand SNAPFIT (dirujuk lewat @id dari produk). */
export function brandNode(sameAs: string[]) {
  return {
    "@type": "Brand",
    "@id": BRAND_ID,
    name: BRAND_NAME,
    alternateName: ["SNAPFIT Indonesia", "Snapfit"],
    description: BRAND_DEFINITION,
    logo: `${SITE}/logo.png`,
    url: `${SITE}/`,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** Toko resmi (OnlineStore ⊂ Organization) pemilik merek. */
export function organizationNode(sameAs: string[]) {
  return {
    "@type": "OnlineStore",
    "@id": ORG_ID,
    name: "SNAPFIT Indonesia",
    alternateName: ["SNAPFIT", "snapfit.id"],
    url: `${SITE}/`,
    logo: `${SITE}/logo.png`,
    description: `${BRAND_DEFINITION} Toko resmi: ${BRAND_SUMMARY}`,
    brand: { "@id": BRAND_ID },
    address: { "@type": "PostalAddress", addressRegion: "DI Yogyakarta", addressCountry: "ID" },
    areaServed: { "@type": "Country", name: "Indonesia" },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: STORE_WA_DISPLAY,
      contactType: "customer service",
      availableLanguage: ["Indonesian"],
    },
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** @graph lengkap untuk beranda: WebSite + Organization + Brand. */
export async function siteIdentityJsonLd() {
  const sameAs = (await getOfficialProfiles()).map((p) => p.url);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE}/#website`,
        name: "SNAPFIT Indonesia",
        alternateName: ["SNAPFIT", "snapfit.id"],
        url: `${SITE}/`,
        publisher: { "@id": ORG_ID },
      },
      organizationNode(sameAs),
      brandNode(sameAs),
    ],
  };
}
