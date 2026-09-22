"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, PackageCheck, Truck, MessageCircle, Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { updateOrder } from "@/lib/actions/admin";
import { ORDER_STATUSES } from "@/lib/validations/admin";
import { waLink, waProcessingMessage, waShippedMessage, waReviewMessage } from "@/lib/wa";

export type AdminOrder = {
  id: string;
  midtransOrderId: string | null;
  status: string;
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNo: string | null;
  courier: string | null;
  createdAt: string;
  address: { name?: string; phone?: string; address?: string; city?: string; postalCode?: string } | null;
  items: { id: string; name: string; price: number; qty: number }[];
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu Bayar", cls: "bg-amber-100 text-amber-700" },
  PAID: { label: "Dibayar", cls: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Diproses", cls: "bg-violet-100 text-violet-700" },
  SHIPPED: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-700" },
  DONE: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-rose-100 text-rose-700" },
};

/** Tautan WA sebagai tombol; null bila nomor tak valid. */
function WaButton({ href, label }: { href: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-600/40 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
    >
      <MessageCircle className="size-3.5" /> {label}
    </a>
  );
}

function OrderRow({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [trackingNo, setTrackingNo] = useState(order.trackingNo ?? "");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // dropdown override manual
  const [manualStatus, setManualStatus] = useState(order.status);

  const badge = STATUS_BADGE[order.status] ?? { label: order.status, cls: "bg-muted text-foreground" };
  const phone = order.address?.phone;

  async function apply(status: (typeof ORDER_STATUSES)[number], tag: string, resi?: string) {
    setBusy(tag);
    setErr(null);
    const res = await updateOrder({ id: order.id, status, trackingNo: resi ?? trackingNo });
    if (res.ok) router.refresh();
    else setErr(res.error ?? "Gagal menyimpan.");
    setBusy(null);
  }

  function ship() {
    if (!trackingNo.trim()) {
      setErr("Masukkan nomor resi dulu sebelum mengirim.");
      return;
    }
    apply("SHIPPED", "ship", trackingNo.trim());
  }

  const isPreProcess = order.status === "PENDING" || order.status === "PAID";

  return (
    <div className="rounded-lg border border-border">
      {/* Ringkasan */}
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-medium">
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="font-mono text-xs">{order.midtransOrderId ?? order.id.slice(0, 8)}</span>
        </button>
        <span className="text-sm text-muted-foreground">{order.address?.name ?? "—"}</span>
        <span className="text-sm font-semibold">{formatRupiah(order.total)}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
      </div>

      {/* Alur aksi kontekstual */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 p-3">
        {isPreProcess && (
          <>
            <Button size="sm" onClick={() => apply("PROCESSING", "process")} disabled={busy !== null}>
              {busy === "process" ? <Loader2 className="size-3.5 animate-spin" /> : <PackageCheck className="size-3.5" />}
              Proses Pesanan
            </Button>
            <WaButton href={waLink(phone, waProcessingMessage(order))} label="WA: diproses" />
          </>
        )}

        {order.status === "PROCESSING" && (
          <>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="No. resi"
              className="w-36 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
            />
            <Button size="sm" onClick={ship} disabled={busy !== null}>
              {busy === "ship" ? <Loader2 className="size-3.5 animate-spin" /> : <Truck className="size-3.5" />}
              Kirim Pesanan
            </Button>
            <WaButton href={waLink(phone, waProcessingMessage(order))} label="WA: diproses" />
          </>
        )}

        {order.status === "SHIPPED" && (
          <>
            <span className="text-xs text-muted-foreground">
              Resi: <span className="font-medium text-foreground">{order.trackingNo ?? "-"}</span>
            </span>
            <WaButton href={waLink(phone, waShippedMessage(order))} label="WA: dikirim + resi" />
            <WaButton href={waLink(phone, waReviewMessage(order))} label="WA: ajak ulas" />
            <Button size="sm" variant="outline" onClick={() => apply("DONE", "done")} disabled={busy !== null}>
              {busy === "done" ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Tandai Selesai
            </Button>
          </>
        )}

        {order.status === "DONE" && (
          <>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <Star className="size-3.5" /> Selesai
            </span>
            <WaButton href={waLink(phone, waReviewMessage(order))} label="WA: ajak ulas" />
          </>
        )}

        {order.status === "CANCELLED" && (
          <span className="text-xs text-muted-foreground">Pesanan dibatalkan.</span>
        )}

        {!phone && order.status !== "CANCELLED" && (
          <span className="text-xs text-muted-foreground">(tanpa no. WA — pakai email otomatis)</span>
        )}
      </div>

      {err && <p className="px-3 pb-2 text-xs text-destructive">{err}</p>}

      {/* Detail + override manual */}
      {open && (
        <div className="border-t border-border p-3 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-medium">Pembeli</p>
              <p className="mt-1 text-muted-foreground">
                {order.address?.name} · {order.address?.phone}
                <br />
                {order.address?.address}, {order.address?.city} {order.address?.postalCode}
              </p>
              {order.courier && <p className="mt-2 text-xs text-muted-foreground">Kurir: {order.courier}</p>}
            </div>
            <div>
              <p className="font-medium">Item</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between gap-3">
                    <span className="truncate">{it.name} × {it.qty}</span>
                    <span>{formatRupiah(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-border pt-1 text-xs">
                <span>Ongkir</span><span>{formatRupiah(order.shippingCost)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span><span>{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Override manual (edge case: batal, koreksi status/resi) */}
          <details className="mt-4 rounded-md border border-border/70 p-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Ubah manual (lanjutan)</summary>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="No. resi"
                className="w-36 rounded-md border border-border bg-background px-2 py-1 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => apply(manualStatus as (typeof ORDER_STATUSES)[number], "manual")}
                disabled={busy !== null}
              >
                {busy === "manual" && <Loader2 className="size-3.5 animate-spin" />} Simpan
              </Button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

export function OrderManager({ orders }: { orders: AdminOrder[] }) {
  if (orders.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada pesanan.</p>;
  }
  return (
    <div className="space-y-3">
      {orders.map((o) => <OrderRow key={o.id} order={o} />)}
    </div>
  );
}
