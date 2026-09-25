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
  const [product, categories, mereks] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: [{ color: "asc" }, { price: "asc" }] },
        extraCategories: { select: { id: true } },
      },
    }),
    db.category.findMany({
      select: { id: true, name: true, parentId: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    db.merek.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }], select: { name: true } }),
  ]);
  if (!product) notFound();

  return (
    <ProductForm
      categories={categories}
      mereks={mereks.map((m) => m.name)}
      initial={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            description: product.description,
            coverImage: product.coverImage,
            images: Array.isArray(product.images) ? (product.images as string[]) : [],
            variantGroups: (product.variantGroups as { groups: { name: string; options: { value: string; desc: string }[] }[] } | null) ?? null,
            weight: product.variants[0]?.weight ?? 200,
            categoryId: product.categoryId,
            extraCategoryIds: product.extraCategories.map((c) => c.id),
            isGrosir: product.isGrosir,
            variants: product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              color: v.color,
              type: v.type,
              sku: v.sku ?? "",
              price: v.price,
              stock: v.stock,
              weight: v.weight,
              image: v.image,
            })),
          }}
    />
  );
}
