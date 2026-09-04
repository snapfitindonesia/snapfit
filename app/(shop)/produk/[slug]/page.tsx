import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/actions/product";
import { PdpView, type PdpProduct } from "@/components/shop/pdp-view";
import { TrustBadges } from "@/components/shop/trust-badges";
import { ProductCard } from "@/components/shop/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produk tidak ditemukan — SnapFit" };
  return {
    title: `${product.name} — SnapFit`,
    description: product.description ?? undefined,
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

  const related = await getRelatedProducts(
    product.id,
    product.category?.slug ?? null,
  );

  // Bentuk data serializable untuk Client Component (tanpa Date dsb.)
  const pdpProduct: PdpProduct = {
    slug: product.slug,
    name: product.name,
    description: product.description,
    coverImage: product.coverImage,
    categoryName: product.category?.name ?? null,
    discountPercent: product.discountPercent,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      image: v.image,
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-32 sm:px-6 sm:py-12 md:pb-12">
      <PdpView product={pdpProduct} />

      <div className="mt-10 max-w-md">
        <TrustBadges />
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">
            Mungkin kamu butuhkan
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
