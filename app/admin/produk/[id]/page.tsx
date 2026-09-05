import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, lines] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: [{ color: "asc" }, { price: "asc" }] } },
    }),
    db.category.findMany({
      where: { parentId: { not: null } },
      select: { id: true, name: true, parent: { select: { name: true } } },
      orderBy: [{ parentId: "asc" }, { order: "asc" }],
    }),
  ]);
  if (!product) notFound();

  const categories = lines.map((c) => ({
    id: c.id,
    name: c.parent ? `${c.parent.name} › ${c.name}` : c.name,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Edit produk</h1>
      <div className="mt-6">
        <ProductForm
          categories={categories}
          initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            coverImage: product.coverImage,
            categoryId: product.categoryId,
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              color: v.color,
              type: v.type,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              weight: v.weight,
              image: v.image,
            })),
          }}
        />
      </div>
    </div>
  );
}
