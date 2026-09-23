import { db } from "@/lib/db";
import { ReviewManager, type ReviewRow, type ProductOption } from "@/components/admin/review-manager";

export const dynamic = "force-dynamic";

export default async function AdminUlasanPage() {
  const [products, reviews] = await Promise.all([
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.review.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    }),
  ]);

  const productOptions: ProductOption[] = products.map((p) => ({ id: p.id, name: p.name }));
  const rows: ReviewRow[] = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    author: r.author,
    image: r.image,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Ulasan Produk</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tambah ulasan manual: pilih produk, isi nama, foto (opsional), bintang, dan ulasan. Tampil di halaman produk beserta rata-rata bintang.
      </p>
      <div className="mt-6">
        <ReviewManager products={productOptions} rows={rows} />
      </div>
    </div>
  );
}
