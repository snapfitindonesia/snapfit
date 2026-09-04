import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { ProductDeleteButton } from "@/components/admin/product-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true } },
      variants: { select: { price: true, stock: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Produk</h1>
        <Button asChild size="sm">
          <Link href="/admin/produk/baru">
            <Plus className="size-4" /> Tambah produk
          </Link>
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Kategori</th>
              <th className="px-4 py-2 font-medium">Varian</th>
              <th className="px-4 py-2 font-medium">Harga mulai</th>
              <th className="px-4 py-2 font-medium">Stok</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const minPrice = p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;
              const stock = p.variants.reduce((n, v) => n + v.stock, 0);
              return (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.variants.length}</td>
                  <td className="px-4 py-3">{formatRupiah(minPrice)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/admin/produk/${p.id}`} className="text-muted-foreground hover:text-foreground" aria-label="Edit">
                        <Pencil className="size-4" />
                      </Link>
                      <ProductDeleteButton id={p.id} name={p.name} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Belum ada produk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
