// Angka dashboard admin dihitung DI DATABASE (agregat), bukan dengan menarik seluruh tabel pesanan ke
// server: tetap cepat & hemat egress walau pesanan sudah ribuan. Hanya pesanan 60 hari terakhir yang
// diambil per baris (grafik & perbandingan 30 hari).
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Pesanan yang dihitung sebagai penjualan (sudah dibayar, tidak batal). */
export const SALE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DONE"];
const SALE_SQL = Prisma.join(SALE_STATUSES);

/** Unit terjual & nilai per varian (semua waktu). */
export async function soldByVariant(): Promise<Map<string, { qty: number; amount: number; name: string }>> {
  const rows = await db.$queryRaw<{ variantId: string; qty: bigint; amount: bigint; name: string }[]>`
    SELECT i."variantId", SUM(i.qty)::bigint AS qty, SUM(i.qty * i.price)::bigint AS amount, MAX(i.name) AS name
    FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
    WHERE o.status IN (${SALE_SQL})
    GROUP BY i."variantId"`;
  return new Map(rows.map((r) => [r.variantId, { qty: Number(r.qty), amount: Number(r.amount), name: r.name }]));
}

export async function getDashboardStats(now = new Date()) {
  const d0 = new Date(now);
  d0.setHours(0, 0, 0, 0);
  const ago = (n: number) => {
    const d = new Date(d0);
    d.setDate(d.getDate() - n);
    return d;
  };
  const sale = { status: { in: SALE_STATUSES } };

  const [omzet, orderCount, unitsAll, [cust], cityRows, recentSales, recentOrders, ordersCur, ordersPrev, sold] = await Promise.all([
    db.order.aggregate({ where: sale, _sum: { total: true } }),
    db.order.count(),
    db.orderItem.aggregate({ where: { order: sale }, _sum: { qty: true } }),
    // Pelanggan unik: member per akun, tamu per nomor HP (fallback nama).
    db.$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(DISTINCT COALESCE("userId", 'g:' || COALESCE(address->>'phone', address->>'name', id)))::bigint AS n
      FROM "Order" WHERE status IN (${SALE_SQL})`,
    db.$queryRaw<{ city: string; total: bigint }[]>`
      SELECT COALESCE(NULLIF(TRIM(address->>'city'), ''), 'Tidak diketahui') AS city, SUM(total)::bigint AS total
      FROM "Order" WHERE status IN (${SALE_SQL})
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5`,
    db.order.findMany({
      where: { ...sale, createdAt: { gte: ago(60) } },
      select: { total: true, createdAt: true, userId: true, address: true, items: { select: { qty: true } } },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, midtransOrderId: true, status: true, total: true, address: true },
    }),
    db.order.count({ where: { createdAt: { gte: ago(30) } } }),
    db.order.count({ where: { createdAt: { gte: ago(60), lt: ago(30) } } }),
    soldByVariant(),
  ]);

  return {
    d0,
    ago,
    omzetTotal: omzet._sum.total ?? 0,
    orderCount,
    unitsTotal: unitsAll._sum.qty ?? 0,
    customersTotal: Number(cust?.n ?? 0),
    cities: cityRows.map((r) => [r.city, Number(r.total)] as [string, number]),
    recentSales,
    recentOrders,
    ordersCur,
    ordersPrev,
    sold,
  };
}
