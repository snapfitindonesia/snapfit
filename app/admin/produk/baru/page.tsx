import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await db.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <h1 className="text-xl font-semibold">Tambah produk</h1>
      <div className="mt-6">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
