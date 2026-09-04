import Link from "next/link";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAID_STATUSES = ["PAID", "SHIPPED", "DONE"];

export default async function AdminDashboardPage() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const omzet = paid.reduce((n, o) => n + o.total, 0);
  const pendingCount = orders.filter((o) => o.status === "PENDING").length;

  // Produk terlaris (dari item order yang sudah dibayar)
  const soldMap = new Map<string, number>();
  for (const o of paid) {
    for (const it of o.items) {
      soldMap.set(it.name, (soldMap.get(it.name) ?? 0) + it.qty);
    }
  }
  const terlaris = [...soldMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Grafik omzet 7 hari terakhir
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const value = paid
      .filter((o) => o.createdAt >= d && o.createdAt < next)
      .reduce((n, o) => n + o.total, 0);
    days.push({ label: d.toLocaleDateString("id-ID", { weekday: "short" }), value });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.value));

  const stats = [
    { label: "Omzet (dibayar)", value: formatRupiah(omzet) },
    { label: "Total order", value: String(orders.length) },
    { label: "Order dibayar", value: String(paid.length) },
    { label: "Menunggu bayar", value: String(pendingCount) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-lg font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border p-5">
          <h2 className="text-sm font-medium">Omzet 7 hari terakhir</h2>
          <div className="mt-4 flex h-40 items-end gap-2">
            {days.map((d, i) => (
              <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div
                  className="w-full min-h-[2px] rounded-t bg-foreground/80"
                  style={{ height: `${(d.value / maxDay) * 100}%` }}
                  title={formatRupiah(d.value)}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border p-5">
          <h2 className="text-sm font-medium">Produk terlaris</h2>
          {terlaris.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {terlaris.map(([name, qty]) => (
                <li key={name} className="flex justify-between gap-3">
                  <span className="truncate text-muted-foreground">{name}</span>
                  <span className="font-medium">{qty} terjual</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Belum ada penjualan.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Order terbaru</h2>
          <Link href="/admin/pesanan" className="text-sm text-muted-foreground hover:text-foreground">
            Lihat semua
          </Link>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {orders.slice(0, 5).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0">
              <span className="font-mono text-xs">{o.midtransOrderId ?? o.id.slice(0, 8)}</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{o.status}</span>
              <span className="font-medium">{formatRupiah(o.total)}</span>
            </div>
          ))}
          {orders.length === 0 && <p className="text-muted-foreground">Belum ada order.</p>}
        </div>
      </div>
    </div>
  );
}
