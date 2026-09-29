import { ProductListPage, LIST_METADATA } from "@/components/shop/product-list-page";

// Statis/ISR: tanpa searchParams → disajikan dari cache CDN (tak query DB tiap kunjungan).
// URL berparameter (?q=, ?tipe=, ...) di-rewrite ke /produk/filter (lihat next.config.mjs).
// Fresh via revalidatePath("/produk") saat admin edit / sinkron stok.
export const revalidate = 300;

export const metadata = LIST_METADATA;

export default function Page() {
  return <ProductListPage />;
}
