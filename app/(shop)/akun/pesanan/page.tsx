import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pesanan Saya" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu Pembayaran", cls: "bg-amber-100 text-amber-700" },
  PAID: { label: "Dibayar", cls: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-700" },
  DONE: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-rose-100 text-rose-700" },
};

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/akun/pesanan");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/akun" className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Pesanan Saya</h1>
      </div>

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
          <Package className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>
          <Link href="/produk" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90">
            Mulai belanja
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((o) => {
            const st = STATUS[o.status] ?? { label: o.status, cls: "bg-muted text-foreground" };
            return (
              <div key={o.id} className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{o.midtransOrderId ?? o.id.slice(0, 12)}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                </div>

                <ul className="mt-3 space-y-1.5 text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-3">
                      <span className="truncate text-muted-foreground">{it.name} × {it.qty}</span>
                      <span className="shrink-0">{formatRupiah(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-sm font-semibold">{formatRupiah(o.total)}</span>
                </div>

                {o.trackingNo && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Resi{o.courier ? ` (${o.courier})` : ""}: <span className="font-medium text-foreground">{o.trackingNo}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
