import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryLanding, categoryTitle } from "@/lib/seo-pages";
import { LandingView } from "@/components/shop/landing-view";

export const revalidate = 300;
// ISR on-demand: halaman dibuat saat pertama dikunjungi lalu di-cache 5 menit.
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

function intro(name: string, level: number, total: number): string {
  const what = level === 1 ? `case dan aksesoris ${name}` : `case ${name}`;
  return `Belanja ${what} original di SNAPFIT Indonesia — ${total} produk dari Ringke, VRS Design, Araree, Supcase, SNAPFIT dan merek premium lainnya. Semua bergaransi resmi, 100% original, dengan gratis ongkir untuk pembelian minimal Rp150.000.`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryLanding(slug);
  if (!data) return { title: "Kategori tidak ditemukan" };
  const title = categoryTitle(data.name, data.level);
  return {
    title,
    description: intro(data.name, data.level, data.total).slice(0, 158),
    alternates: { canonical: `/kategori/${slug}` },
    // Kategori tanpa produk: jangan diindeks (halaman tipis).
    robots: data.total === 0 ? { index: false, follow: true } : undefined,
    openGraph: {
      title: `${title} | SNAPFIT Indonesia`,
      url: `/kategori/${slug}`,
      images: data.items[0]?.coverImage ? [data.items[0].coverImage] : undefined,
    },
  };
}

export default async function CategoryLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCategoryLanding(slug);
  if (!data) notFound();

  return (
    <LandingView
      path={`/kategori/${slug}`}
      crumbs={data.crumbs}
      title={categoryTitle(data.name, data.level)}
      intro={intro(data.name, data.level, data.total)}
      chips={data.children.map((c) => ({ name: c.name, href: `/kategori/${c.slug}`, count: c.count }))}
      items={data.items}
      total={data.total}
      moreHref={`/produk?tipe=${encodeURIComponent(slug)}`}
    />
  );
}
