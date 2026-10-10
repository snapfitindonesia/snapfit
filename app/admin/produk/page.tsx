import Link from "next/link";
import { Plus, Upload, DownloadCloud, FileSpreadsheet } from "lucide-react";
import { db } from "@/lib/db";
import { soldByVariant } from "@/lib/admin/stats";
import { Button } from "@/components/ui/button";
import { ProductTable, type AdminProduct } from "@/components/admin/product-table";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, sold] = await Promise.all([
    db.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        variants: {
          orderBy: [{ color: "asc" }, { price: "asc" }],
          select: { id: true, name: true, color: true, type: true, price: true, stock: true, image: true, sku: true },
        },
      },
    }),
    soldByVariant(), // agregat di database (bukan menarik semua pesanan)
  ]);

  const data: AdminProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    coverImage: p.coverImage,
    category: p.category?.name ?? null,
    isGrosir: p.isGrosir,
    archived: p.archived,
    archivedBy: p.archivedBy,
    // Unit terjual = jumlah semua varian produk (dulu dicocokkan lewat nama → selalu 0 karena item
    // pesanan bernama "Produk — Varian").
    sold: p.variants.reduce((n, v) => n + (sold.get(v.id)?.qty ?? 0), 0),
    variants: p.variants,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Produk Saya</h1>
          <p className="text-sm text-muted-foreground">Kelola produk & varian toko SNAPFIT</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/ginee/impor">
              <DownloadCloud className="size-4" /> Impor Ginee
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/produk/impor">
              <Upload className="size-4" /> Impor CSV
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/produk/edit-massal">
              <FileSpreadsheet className="size-4" /> Edit Massal
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/produk/baru">
              <Plus className="size-4" /> Tambah Produk Baru
            </Link>
          </Button>
        </div>
      </div>

      <ProductTable products={data} />
    </div>
  );
}
