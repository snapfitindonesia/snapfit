import { db } from "@/lib/db";
import { CategoryManager, type CatNode, type ParentOption } from "@/components/admin/category-manager";

export const dynamic = "force-dynamic";

export default async function AdminCategoryPage() {
  const brands = await db.category.findMany({
    where: { parentId: null },
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, image: true, order: true,
      _count: { select: { products: true } },
      children: {
        orderBy: [{ order: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, slug: true, image: true, order: true,
          _count: { select: { products: true } },
          children: {
            orderBy: [{ order: "asc" }, { name: "asc" }],
            select: { id: true, name: true, slug: true, image: true, order: true, _count: { select: { products: true } } },
          },
        },
      },
    },
  });

  const node = (c: {
    id: string; name: string; slug: string; image: string | null; order: number;
    _count: { products: number };
    children?: unknown[];
  }, children: CatNode[] = []): CatNode => ({
    id: c.id, name: c.name, slug: c.slug, image: c.image, order: c.order, products: c._count.products, children,
  });

  const tree: CatNode[] = brands.map((b) =>
    node(b, b.children.map((l) => node(l, l.children.map((m) => node(m))))),
  );

  // Opsi induk: brand (L1) + seri (L2) — model (L3) tak boleh jadi induk.
  const parentOptions: ParentOption[] = [];
  for (const b of brands) {
    parentOptions.push({ id: b.id, label: b.name });
    for (const l of b.children) parentOptions.push({ id: l.id, label: `${b.name} › ${l.name}` });
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Kategori</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        3 tingkat: <b>Brand</b> → <b>Seri</b> → <b>Model</b>. Foto dipakai di mega menu. Seret ⠿ untuk mengurutkan.
      </p>
      <div className="mt-6">
        <CategoryManager tree={tree} parentOptions={parentOptions} />
      </div>
    </div>
  );
}
