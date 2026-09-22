import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { getOrderSummary } from "@/lib/actions/order";
import { isManualPayment, MANUAL_BANK } from "@/lib/payment";
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

  const awaitingPayment = order.status === "PENDING" && isManualPayment();

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      {/* Event purchase hanya saat sudah dibayar */}
      {!awaitingPayment && (
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
      )}

      <div className="flex flex-col items-center text-center">
        {awaitingPayment ? (
          <>
            <Clock className="size-14 text-amber-500" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pesanan dibuat</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Selesaikan pembayaran via transfer di bawah. Pesanan diproses setelah kami verifikasi.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="size-14 text-foreground" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pembayaran berhasil</h1>
            <p className="mt-2 text-sm text-muted-foreground">Terima kasih! Pesananmu sedang kami siapkan.</p>
          </>
        )}
      </div>

      {/* Instruksi transfer (transfer manual, belum dibayar) */}
      {awaitingPayment && (
        <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-900">Instruksi Pembayaran</p>
          <p className="mt-1 text-sm text-amber-800">
            Transfer tepat sejumlah total ke rekening berikut:
          </p>
          <div className="mt-3 rounded-lg border border-amber-200 bg-white p-4">
            <p className="text-xs text-muted-foreground">{MANUAL_BANK.bank}</p>
            <p className="font-mono text-lg font-bold">{MANUAL_BANK.accountNumber}</p>
            <p className="text-sm">a/n {MANUAL_BANK.accountName}</p>
            <div className="my-3 border-t border-amber-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jumlah transfer</span>
              <span className="text-lg font-bold">{formatRupiah(order.total)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-800">
            Setelah transfer, konfirmasi ke admin (sertakan No. Pesanan) agar segera diproses.
            Cek status kapan saja di <Link href="/akun/pesanan" className="font-medium underline">Pesanan Saya</Link>.
          </p>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-border p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">No. Pesanan</dt>
            <dd className="font-mono">{order.midtransOrderId}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">{awaitingPayment ? "Menunggu Pembayaran" : order.status}</dd>
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
              <span className="min-w-0 truncate">{it.name} × {it.qty}</span>
              <span className="shrink-0 font-medium">{formatRupiah(it.price * it.qty)}</span>
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
