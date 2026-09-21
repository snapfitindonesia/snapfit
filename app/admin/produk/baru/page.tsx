import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const lines = await db.category.findMany({
    where: { parentId: { not: null } },
    select: { id: true, name: true, parent: { select: { name: true } } },
    orderBy: [{ parentId: "asc" }, { order: "asc" }],
  });
  const categories = lines.map((c) => ({
    id: c.id,
    name: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
  }));
  return <ProductForm categories={categories} />;
}
