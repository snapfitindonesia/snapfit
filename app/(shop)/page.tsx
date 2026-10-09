import type { Metadata } from "next";
import { STORE_WA_DISPLAY } from "@/lib/contact";
import { getHomeSections, loadHomeData, type HomeData } from "@/lib/home/data";
import { DEFAULT_SECTIONS, type HomeSection } from "@/lib/home/sections";
import { HomeSections } from "@/components/home/home-sections";
import { buildFallback } from "@/lib/build-fallback";

// ISR: beranda di-cache (cepat), regenerasi tiap 5 menit; simpan di Admin → Konten Beranda
// memperbarui langsung (revalidatePath("/")).
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const SITE = "https://www.snapfit.id";
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SNAPFIT Indonesia",
    alternateName: ["SNAPFIT", "snapfit.id"],
    url: `${SITE}/`,
  },
  {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: "SNAPFIT Indonesia",
    url: `${SITE}/`,
    logo: `${SITE}/logo.png`,
    description: "Toko resmi SNAPFIT: case HP, pelindung layar & aksesori untuk iPhone, Samsung Galaxy, dan AirPods.",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: STORE_WA_DISPLAY,
      contactType: "customer service",
      availableLanguage: ["Indonesian"],
    },
  },
];

export default async function HomePage() {
  // DB ngadat SAAT BUILD → isi bawaan. Saat regenerasi ISR → error dilempar sehingga beranda lama yang
  // benar tetap disajikan (bukan beranda kosong yang ikut ter-cache). Lihat lib/build-fallback.ts.
  let sections: HomeSection[] = DEFAULT_SECTIONS;
  try {
    sections = await getHomeSections();
  } catch (e) {
    sections = buildFallback(e, DEFAULT_SECTIONS);
  }
  let data: HomeData = { products: {}, reviews: null, shots: [], articles: [] };
  try {
    data = await loadHomeData(sections);
  } catch (e) {
    data = buildFallback(e, data);
  }

  // H1 = judul hero pertama (bila hero ada di paling atas); selain itu H1 tersembunyi untuk SEO.
  const first = sections.find((s) => s.active);
  const heroH1 = first?.type === "hero" && !!first.title;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }} />
      {!heroH1 && <h1 className="sr-only">SNAPFIT Indonesia — Case & Aksesori HP</h1>}
      <HomeSections sections={sections} data={data} />
    </>
  );
}
