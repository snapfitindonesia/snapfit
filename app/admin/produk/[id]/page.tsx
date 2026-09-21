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
    <ProductForm
      categories={categories}
      initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            description: product.description,
            coverImage: product.coverImage,
            images: Array.isArray(product.images) ? (product.images as string[]) : [],
            categoryId: product.categoryId,
            isGrosir: product.isGrosir,
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
  );
}
