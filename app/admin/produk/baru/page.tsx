import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    select: { id: true, name: true, parentId: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return <ProductForm categories={categories} />;
}
