import { db } from "@/lib/db";
import { CategoryManager, type CatNode } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoryPage() {
  const brands = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      _count: { select: { products: true } },
      children: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: { id: true, name: true, slug: true, order: true, _count: { select: { products: true } } },
      },
    },
  });

  const tree: CatNode[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    order: b.order,
    products: b._count.products,
    children: b.children.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      order: c.order,
      products: c._count.products,
      children: [],
    })),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Kategori</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pohon 2 tingkat: <b>Brand</b> (induk) → <b>Seri</b> (anak). Slug dibuat otomatis dari nama.
      </p>
      <div className="mt-6">
        <CategoryManager tree={tree} />
      </div>
    </div>
  );
}
