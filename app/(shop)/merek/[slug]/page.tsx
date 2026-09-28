import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMerekLanding } from "@/lib/seo-pages";
import { LandingView } from "@/components/shop/landing-view";

export const revalidate = 300;
// ISR on-demand: halaman dibuat saat pertama dikunjungi lalu di-cache 5 menit.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

// Sejak 28 Sep 2026 toko hanya menjual SNAPFIT: halaman merek lain (masih terindeks Google)
// dialihkan permanen ke Semua Produk, bukan 404.
const OWN_BRAND = "snapfit";

function titleOf(name: string): string {
  return `${name} Indonesia - Case Original Bergaransi`;
}

function intro(name: string, slug: string, total: number): string {
  const who = slug === OWN_BRAND ? "SNAPFIT adalah merek aksesori gadget kami sendiri" : `Koleksi ${name} di SNAPFIT dijamin original`;
  return `Belanja case dan aksesoris ${name} original — ${total} produk tersedia. ${who}: bergaransi resmi, 100% original, gratis ongkir s/d Rp20.000 untuk pembelian minimal Rp150.000.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug !== OWN_BRAND) permanentRedirect("/produk");
  const data = await getMerekLanding(slug);
  if (!data) return { title: "Merek tidak ditemukan" };
  const title = titleOf(data.name);
  return {
    title,
    description: intro(data.name, slug, data.total).slice(0, 158),
    alternates: { canonical: `/merek/${slug}` },
    robots: data.total === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | SNAPFIT Indonesia`,
      url: `/merek/${slug}`,
      images: data.items[0]?.coverImage ? [data.items[0].coverImage] : undefined,
    },
  };
}

export default async function MerekLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== OWN_BRAND) permanentRedirect("/produk");
  const data = await getMerekLanding(slug);
  if (!data) notFound();

  return (
    <LandingView
      path={`/merek/${slug}`}
      crumbs={[{ name: "Semua Produk", href: "/produk" }]}
      title={titleOf(data.name)}
      intro={intro(data.name, slug, data.total)}
      items={data.items}
      total={data.total}
      moreHref="/produk"
    />
  );
}
