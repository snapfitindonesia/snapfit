import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { getOrderSummary } from "@/lib/actions/order";
import { PurchaseTracker } from "@/components/tracking/purchase-tracker";

export const metadata = {
  title: "Pesanan Berhasil — SNAPFIT",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const order = orderId ? await getOrderSummary(orderId) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Pesanan tidak ditemukan</h1>
        <Button className="mt-6" asChild>
          <Link href="/produk">Kembali belanja</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      <PurchaseTracker
        transactionId={order.midtransOrderId ?? order.id}
        value={order.total}
        items={order.items.map((it) => ({
          item_id: it.variantId,
          item_name: it.name,
          price: it.price,
          quantity: it.qty,
        }))}
      />
      <div className="flex flex-col items-center text-center">
        <CheckCircle2 className="size-14 text-foreground" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Pembayaran berhasil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Terima kasih! Pesananmu sedang kami siapkan.
        </p>
      </div>

      <div className="mt-8 rounded-xl border border-border p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">No. Pesanan</dt>
            <dd className="font-mono">{order.midtransOrderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{order.status}</dd>
          </div>
          {order.trackingNo && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">No. Resi</dt>
              <dd className="font-mono">{order.trackingNo}</dd>
            </div>
          )}
        </dl>

        <div className="my-4 border-t border-border" />

        <ul className="space-y-2 text-sm">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {it.name} × {it.qty}
              </span>
              <span className="shrink-0 font-medium">
                {formatRupiah(it.price * it.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-border" />

        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatRupiah(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Ongkir</dt>
            <dd>{formatRupiah(order.shippingCost)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatRupiah(order.total)}</dd>
          </div>
        </dl>
      </div>

      <Button className="mt-8 w-full" asChild>
        <Link href="/produk">Lanjut belanja</Link>
      </Button>
    </div>
  );
}
