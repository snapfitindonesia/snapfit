import { db } from "@/lib/db";
import { FeaturedManager, type FeaturedRow } from "@/components/admin/featured-manager";

export const dynamic = "force-dynamic";

export default async function AdminUnggulanPage() {
  const products = await db.product.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: { id: true, name: true, coverImage: true, featured: true, category: { select: { name: true } } },
  });
  const rows: FeaturedRow[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    coverImage: p.coverImage,
    category: p.category?.name ?? null,
    featured: p.featured,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Produk Unggulan</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pilih produk yang tampil di bagian <b>&quot;Produk unggulan&quot;</b> pada homepage. Klik &quot;Jadikan unggulan&quot; untuk menambah/lepas.
      </p>
      <div className="mt-6">
        <FeaturedManager products={rows} />
      </div>
    </div>
  );
}
