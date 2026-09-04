"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { updateOrder } from "@/lib/actions/admin";
import { ORDER_STATUSES } from "@/lib/validations/admin";

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

function OrderRow({ order }: { order: AdminOrder }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [trackingNo, setTrackingNo] = useState(order.trackingNo ?? "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await updateOrder({ id: order.id, status: status as (typeof ORDER_STATUSES)[number], trackingNo });
    if (res.ok) router.refresh();
    else alert(res.error);
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 text-sm font-medium">
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          <span className="font-mono text-xs">{order.midtransOrderId ?? order.id.slice(0, 8)}</span>
        </button>
        <span className="text-sm text-muted-foreground">{order.address?.name ?? "—"}</span>
        <span className="text-sm font-semibold">{formatRupiah(order.total)}</span>

        <div className="ml-auto flex items-center gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="No. resi"
            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-xs"
          />
          <Button size="sm" variant="outline" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-3.5 animate-spin" />} Simpan
          </Button>
        </div>
      </div>

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
