import { getCategories, getProducts, getBrandFacets } from "@/lib/actions/product";
import { productQuerySchema } from "@/lib/validations/product";
import { ProductListing } from "@/components/shop/product-listing";

export type ListParams = { tipe?: string; model?: string; sort?: string; q?: string };

export const LIST_METADATA = {
  title: "Semua Produk - Case HP, Tablet & AirPods Original",
  description: "Belanja case HP, pelindung layar & aksesori AirPods SNAPFIT. Filter sesuai tipe HP-mu, garansi resmi, gratis ongkir s/d Rp20rb min. Rp150rb.",
};

/**
 * Isi halaman daftar produk. Dipakai 2 rute: /produk (tanpa parameter → statis/ISR, dari cache
 * CDN) dan /produk/filter (dinamis; next.config me-rewrite /produk?tipe|model|sort|q= ke sana,
 * URL di browser tetap /produk?...). Interaksi berikutnya via AJAX di client.
 */
export async function ProductListPage({ params = {} }: { params?: ListParams }) {
  const query = productQuerySchema.parse({ tipe: params.tipe, model: params.model, sort: params.sort, q: params.q });

  const [categories, brandFacets, initial] = await Promise.all([
    getCategories(),
    getBrandFacets(),
    getProducts(query),
  ]);

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6 lg:px-10 sm:py-12">
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
