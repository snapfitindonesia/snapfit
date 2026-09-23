import { db } from "@/lib/db";
import { DiscountManager } from "@/components/admin/discount-manager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountPage() {
  const [discounts, products] = await Promise.all([
    db.discount.findMany({
      orderBy: { name: "asc" },
      include: { variants: { select: { id: true } } },
    }),
    db.product.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        variants: {
          orderBy: [{ color: "asc" }, { type: "asc" }],
          select: { id: true, name: true, price: true },
        },
      },
    }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold">Diskon per Varian</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pilih varian mana yang kena diskon — beda varian bisa beda diskon (buat beberapa aturan).
      </p>
      <div className="mt-6">
        <DiscountManager
          discounts={discounts.map((d) => ({
            id: d.id,
            name: d.name,
            percent: d.percent,
            active: d.active,
            variantIds: d.variants.map((v) => v.id),
          }))}
          products={products}
        />
      </div>
    </div>
  );
}
