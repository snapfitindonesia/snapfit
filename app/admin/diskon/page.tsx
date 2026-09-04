import { db } from "@/lib/db";
import { DiscountManager } from "@/components/admin/discount-manager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountPage() {
  const [discounts, products] = await Promise.all([
    db.discount.findMany({
      orderBy: { name: "asc" },
      include: { products: { select: { id: true } } },
    }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Diskon massal</h1>
      <div className="mt-6">
        <DiscountManager
          discounts={discounts.map((d) => ({
            id: d.id,
            name: d.name,
            percent: d.percent,
            active: d.active,
            productIds: d.products.map((p) => p.id),
          }))}
          products={products}
        />
      </div>
    </div>
  );
}
