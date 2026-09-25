import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { BulkEdit, type EditRow } from "@/components/admin/bulk-edit";

export const dynamic = "force-dynamic";

export default async function BulkEditPage() {
  const products = await db.product.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, brand: true,
      variants: {
        orderBy: [{ color: "asc" }, { price: "asc" }],
        select: { id: true, color: true, type: true, sku: true, price: true, stock: true, weight: true, name: true },
      },
    },
  });

  const rows: EditRow[] = products.flatMap((p) =>
    p.variants.map((v) => ({
      variantId: v.id,
      productId: p.id,
      nama_produk: p.name,
      brand: p.brand ?? "",
      varian: [v.color, v.type].filter(Boolean).join(" · ") || v.name,
      sku: v.sku ?? "",
      harga: v.price,
      stok: v.stock,
      berat: v.weight,
    })),
  );

  return (
    <div>
      <Link href="/admin/produk" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Kembali ke Produk
      </Link>
      <h1 className="mt-2 text-xl font-semibold">Edit Produk Massal</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Perbarui harga, stok, SKU, berat, nama, atau merek banyak produk sekaligus lewat file CSV/Excel.
      </p>
      <div className="mt-6">
        <BulkEdit rows={rows} />
      </div>
    </div>
  );
}
