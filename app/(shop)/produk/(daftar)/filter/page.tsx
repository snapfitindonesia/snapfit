import type { Metadata } from "next";
import { ProductListPage, LIST_METADATA, type ListParams } from "@/components/shop/product-list-page";

// Target rewrite /produk?tipe|model|sort|q=... (next.config.mjs) — dinamis per parameter.
// Tak untuk diindeks: kanonik tetap /produk.
export const metadata: Metadata = {
  ...LIST_METADATA,
  alternates: { canonical: "/produk" },
  robots: { index: false, follow: true },
};

export default async function Page({ searchParams }: { searchParams: Promise<ListParams> }) {
  const sp = await searchParams;
  return <ProductListPage params={sp} />;
}
