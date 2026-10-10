import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { getOrderSummary } from "@/lib/orders/paid";
import { isManualPayment } from "@/lib/payment";
import { getBankAccounts } from "@/lib/bank-settings";
import { PurchaseTracker } from "@/components/tracking/purchase-tracker";
import { GoogleCustomerReviews } from "@/components/tracking/google-customer-reviews";
import { PaymentPoll } from "@/components/shop/payment-poll";
import { CUSTOMER_STATUS } from "@/lib/order-status";
import { PENDING_EXPIRE_DAYS } from "@/lib/validations/admin";

const PAID_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DONE"];

export const metadata = {
  title: "Status Pesanan",
  robots: { index: false },
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

  // Tampilan mengikuti status ASLI pesanan (bukan sekadar "sampai di halaman ini"): Midtrans onPending
  // (VA/QRIS belum dibayar) & pesanan batal tak boleh tampil "Pembayaran berhasil" / tercatat sebagai pembelian.
  const paid = PAID_STATUSES.includes(order.status);
  const cancelled = order.status === "CANCELLED";
  const awaitingPayment = order.status === "PENDING" && isManualPayment();
  const awaitingGateway = order.status === "PENDING" && !isManualPayment();
  const banks = awaitingPayment ? await getBankAccounts() : [];
  const addr = (order.address ?? {}) as { email?: string; phone?: string };

  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
      {/* Event purchase hanya saat sudah dibayar */}
      {paid && (
        <PurchaseTracker
          transactionId={order.midtransOrderId ?? order.id}
          value={order.total}
          items={order.items.map((it) => ({
            item_id: it.variantId,
            item_name: it.name,
            price: it.price,
            quantity: it.qty,
          }))}
          email={addr.email}
          phone={addr.phone}
        />
      )}
      {/* Google Customer Reviews: tawarkan survei hanya untuk pesanan yang sudah dibayar */}
      {paid && (
        <GoogleCustomerReviews orderId={order.midtransOrderId ?? order.id} email={addr.email} />
      )}

      <div className="flex flex-col items-center text-center">
        {awaitingPayment ? (
          <>
            <Clock className="size-14 text-amber-500" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pesanan dibuat</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Selesaikan pembayaran via transfer di bawah dalam {PENDING_EXPIRE_DAYS} hari. Pesanan diproses setelah kami verifikasi.
            </p>
          </>
        ) : awaitingGateway ? (
          <>
            <PaymentPoll />
            <Clock className="size-14 text-amber-500" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Menunggu pembayaran</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Selesaikan pembayaran sesuai instruksi (Virtual Account / QRIS / e-wallet). Halaman ini diperbarui otomatis
              setelah pembayaran kami terima.
            </p>
          </>
        ) : cancelled ? (
          <>
            <XCircle className="size-14 text-rose-500" />
            <h1 className="mt-4 text-2xl font-semibold tracking-tight">Pesanan dibatalkan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pesanan ini sudah dibatalkan. Sudah terlanjur membayar? Hubungi kami dengan menyertakan No. Pesanan.
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
            Transfer tepat sejumlah total ke {banks.length > 1 ? "salah satu rekening" : "rekening"} berikut:
          </p>
          <div className="mt-3 rounded-lg border border-amber-200 bg-white p-4">
            {banks.map((bank, i) => (
              <div key={bank.bank + bank.accountNumber} className={i ? "mt-3 border-t border-amber-200 pt-3" : undefined}>
                <p className="text-xs text-muted-foreground">{bank.bank}</p>
                <p className="font-mono text-lg font-bold">{bank.accountNumber}</p>
                <p className="text-sm">a/n {bank.accountName}</p>
              </div>
            ))}
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
            <dd className="font-medium">{CUSTOMER_STATUS[order.status]?.label ?? order.status}</dd>
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
