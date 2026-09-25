import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getRelatedProducts,
  getProductReviews,
} from "@/lib/actions/product";
import { PdpView, type PdpProduct } from "@/components/shop/pdp-view";
import { ProductCard } from "@/components/shop/product-card";
import { ProductReviews } from "@/components/shop/product-reviews";
import { getActiveVouchers } from "@/lib/actions/voucher";
import { applyDiscount } from "@/lib/format";

// ISR: PDP di-generate on-demand saat request pertama lalu DI-CACHE 5 menit
// (tak query DB saat build → deploy Vercel aman). Fresh via revalidatePath saat admin edit.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan — SNAPFIT" };
  const title = `${product.name} — SNAPFIT`;
  const description = product.description ?? `Beli ${product.name} di SNAPFIT.`;
  const image = product.coverImage;
  return {
    title,
    description,
    alternates: { canonical: `/produk/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/produk/${product.slug}`,
      images: image ? [{ url: image, width: 1000, height: 1000, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug); // RSC: muat awal server-side
  if (!product) notFound();

  const [related, reviews, vouchers] = await Promise.all([
    getRelatedProducts(product.id, product.category?.slug ?? null),
    getProductReviews(product.id),
    getActiveVouchers(),
  ]);

  // Bentuk data serializable untuk Client Component (tanpa Date dsb.)
  const pdpProduct: PdpProduct = {
    slug: product.slug,
    name: product.name,
    description: product.description,
    coverImage: product.coverImage,
    categoryName: product.category?.name ?? null,
    discountPercent: product.discountPercent,
    group1Name: (product.variantGroups as { groups?: { name?: string }[] } | null)?.groups?.[0]?.name || null,
    group2Name: (product.variantGroups as { groups?: { name?: string }[] } | null)?.groups?.[1]?.name || null,
    gallery: Array.isArray(product.images) ? (product.images as string[]) : [],
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      color: v.color,
      type: v.type,
      sku: v.sku ?? "",
      price: v.price,
      stock: v.stock,
      image: v.image,
      discountPercent: v.discountPercent,
    })),
  };

  // ---- Structured data (JSON-LD Product) untuk Google rich results ----
  const finals = product.variants.map((v) => applyDiscount(v.price, v.discountPercent));
  const inStock = product.variants.some((v) => v.stock > 0);
  const ratingCount = reviews.length;
  const ratingAvg = ratingCount ? reviews.reduce((s, r) => s + r.rating, 0) / ratingCount : 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.coverImage, ...(Array.isArray(product.images) ? (product.images as string[]) : [])].filter(Boolean),
    ...(product.description ? { description: product.description } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IDR",
      lowPrice: Math.min(...finals),
      highPrice: Math.max(...finals),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(ratingAvg.toFixed(1)), reviewCount: ratingCount } }
      : {}),
  };

  return (
    <div className="pb-32 md:pb-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* Above-fold: kartu putih mengambang di atas latar abu-abu (ala Nomad) */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <PdpView
            product={pdpProduct}
            vouchers={vouchers.map((v) => ({ code: v.code, label: v.label, minPurchase: v.minPurchase }))}
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Mungkin kamu butuhkan
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        {/* Ulasan (target anchor dari rating) */}
        <div id="ulasan" className="scroll-mt-24">
          <ProductReviews reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
