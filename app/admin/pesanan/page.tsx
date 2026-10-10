import { db } from "@/lib/db";
import { OrderManager, type AdminOrder } from "@/components/admin/order-manager";
import { isGineeConfigured } from "@/lib/ginee/config";
import { ensureReviewToken, reviewUrl, REVIEWABLE_STATUSES } from "@/lib/review-token";

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
    select: { id: true, sku: true, image: true, product: { select: { gineeProductId: true } } },
  });
  const vMap = new Map(variants.map((v) => [v.id, v]));

  // Tautan form ulasan untuk tombol "WA: ajak ulas" (token dibuat sekali per pesanan).
  const reviewUrls = new Map<string, string>();
  for (const o of orders.filter((o) => REVIEWABLE_STATUSES.includes(o.status))) {
    reviewUrls.set(o.id, reviewUrl(await ensureReviewToken(o)));
  }

  const gineeOn = isGineeConfigured();
  const data: AdminOrder[] = orders.map((o) => ({
    id: o.id,
    midtransOrderId: o.midtransOrderId,
    status: o.status,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    discount: o.discount,
    voucherCodes: o.voucherCodes,
    coinsUsed: o.coinsUsed,
    member: !!o.userId,
    total: o.total,
    trackingNo: o.trackingNo,
    courier: o.courier,
    createdAt: o.createdAt.toISOString(),
    address: o.address as AdminOrder["address"],
    reviewUrl: reviewUrls.get(o.id) ?? null,
    // Lunas tapi belum tercatat di Ginee (push gagal) → badge + tombol kirim ulang.
    gineeMissing:
      gineeOn &&
      !o.gineePushedAt &&
      (o.status === "PAID" || o.status === "PROCESSING") &&
      o.items.some((it) => { const v = vMap.get(it.variantId); return !!v?.sku && !!v.product.gineeProductId; }),
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
