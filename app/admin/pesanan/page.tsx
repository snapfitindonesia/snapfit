import Link from "next/link";
import { db } from "@/lib/db";
import { OrderManager, type AdminOrder } from "@/components/admin/order-manager";
import { isGineeConfigured } from "@/lib/ginee/config";
import { ensureReviewToken, reviewUrl, REVIEWABLE_STATUSES } from "@/lib/review-token";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
// Tab filter: "aktif" = yang perlu ditindak (belum bayar / dibayar / dikemas).
const TABS = [
  { key: "aktif", label: "Perlu diproses", statuses: ["PENDING", "PAID", "PROCESSING"] },
  { key: "PENDING", label: "Menunggu Bayar", statuses: ["PENDING"] },
  { key: "PAID", label: "Dibayar", statuses: ["PAID"] },
  { key: "PROCESSING", label: "Diproses", statuses: ["PROCESSING"] },
  { key: "SHIPPED", label: "Dikirim", statuses: ["SHIPPED"] },
  { key: "DONE", label: "Selesai", statuses: ["DONE"] },
  { key: "CANCELLED", label: "Dibatalkan", statuses: ["CANCELLED"] },
  { key: "semua", label: "Semua", statuses: null },
] as const;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.status) ?? TABS[TABS.length - 1]!;
  const page = Math.max(1, Math.min(10_000, Number(sp.page) || 1));
  const where = tab.statuses ? { status: { in: [...tab.statuses] } } : {};

  // Hanya 1 halaman (50 pesanan) yang dimuat — dulu SEMUA pesanan + item + alamat ditarik tiap buka halaman.
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (statuses: readonly string[] | null) =>
    counts.filter((c) => !statuses || statuses.includes(c.status)).reduce((n, c) => n + c._count._all, 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: { status?: string; page?: number }) => {
    const q = new URLSearchParams();
    const st = p.status ?? tab.key;
    if (st !== "semua") q.set("status", st);
    if ((p.page ?? 1) > 1) q.set("page", String(p.page));
    const qs = q.toString();
    return qs ? `/admin/pesanan?${qs}` : "/admin/pesanan";
  };

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
      <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Filter status">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={href({ status: t.key })}
            className={`rounded-full border px-3 py-1 text-xs ${t.key === tab.key ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"}`}
          >
            {t.label} <span className="opacity-60">{countOf(t.statuses)}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-4">
        {data.length ? <OrderManager orders={data} /> : <p className="text-sm text-muted-foreground">Tidak ada pesanan.</p>}
      </div>
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href({ page: page - 1 })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">← Sebelumnya</Link> : <span />}
          <span className="text-muted-foreground">Halaman {page} dari {pages} · {total} pesanan</span>
          {page < pages ? <Link href={href({ page: page + 1 })} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">Berikutnya →</Link> : <span />}
        </div>
      )}
    </div>
  );
}
