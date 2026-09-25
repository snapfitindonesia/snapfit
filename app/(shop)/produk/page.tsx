import { getCategories, getProducts, getBrandFacets } from "@/lib/actions/product";
import { productQuerySchema } from "@/lib/validations/product";
import { ProductListing } from "@/components/shop/product-listing";

export const metadata = {
  title: "Semua Produk — SNAPFIT",
  description: "Case & pelindung untuk iPhone, Samsung, iPad, dan tablet.",
};

export default async function ProductListPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string; model?: string; sort?: string; q?: string }>;
}) {
  const sp = await searchParams;
  // Muat awal via RSC (cepat + SEO); interaksi berikutnya via AJAX di client.
  const query = productQuerySchema.parse({ tipe: sp.tipe, model: sp.model, sort: sp.sort, q: sp.q });

  const [categories, brandFacets, initial] = await Promise.all([
    getCategories(),
    getBrandFacets(),
    getProducts(query),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Semua Produk
        </h1>
        <p className="mt-2 text-muted-foreground">
          Pilih tipe HP-mu, temukan yang pas.
        </p>
      </header>

      <ProductListing
        devices={categories.map((c) => ({ name: c.name, slug: c.slug }))}
        brands={brandFacets.brands}
        hasNoBrand={brandFacets.hasNoBrand}
        initial={initial}
        initialTipe={query.tipe ?? ""}
        initialModel={query.model ?? ""}
        initialSort={query.sort}
        initialQ={query.q ?? ""}
      />
    </div>
  );
}
