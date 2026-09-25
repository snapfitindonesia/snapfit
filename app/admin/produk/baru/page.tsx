import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const [categories, mereks] = await Promise.all([
    db.category.findMany({
      select: { id: true, name: true, parentId: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    db.merek.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { name: true } }),
  ]);
  return <ProductForm categories={categories} mereks={mereks.map((m) => m.name)} />;
}
