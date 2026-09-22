import { db } from "@/lib/db";
import { OrderManager, type AdminOrder } from "@/components/admin/order-manager";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  // Lengkapi tiap item dgn SKU + foto varian (varian bisa terhapus → fallback aman).
  const variantIds = [...new Set(orders.flatMap((o) => o.items.map((it) => it.variantId)))];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds } },
    select: { id: true, sku: true, image: true },
  });
  const vMap = new Map(variants.map((v) => [v.id, v]));

  const data: AdminOrder[] = orders.map((o) => ({
    id: o.id,
    midtransOrderId: o.midtransOrderId,
    status: o.status,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    trackingNo: o.trackingNo,
    courier: o.courier,
    createdAt: o.createdAt.toISOString(),
    address: o.address as AdminOrder["address"],
    items: o.items.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      qty: it.qty,
      sku: vMap.get(it.variantId)?.sku ?? null,
      image: vMap.get(it.variantId)?.image ?? null,
    })),
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Pesanan</h1>
      <div className="mt-6">
        <OrderManager orders={data} />
      </div>
    </div>
  );
}
