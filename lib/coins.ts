import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { cashbackFor } from "@/lib/coins-rules";
import { getCoinRules } from "@/lib/coins-settings";

/**
 * Koin member (aturan: lib/coins-rules.ts). Buku besar CoinEntry:
 * - perolehan = lot (+) dengan `remaining` & `expiresAt` sendiri;
 * - pemakaian mengurangi lot paling cepat hangus dulu (FIFO) + baris (−);
 * - setiap transaksi punya `ref` unik → dipanggil berulang pun tak pernah dobel.
 */

type Tx = Prisma.TransactionClient;

const DAY = 86_400_000;
const liveLots = (userId: string, now = new Date()) => ({ userId, remaining: { gt: 0 }, expiresAt: { gt: now } });

function isDuplicate(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

export async function getCoinBalance(userId: string, client: Tx | typeof db = db): Promise<number> {
  const r = await client.coinEntry.aggregate({ where: liveLots(userId), _sum: { remaining: true } });
  return r._sum.remaining ?? 0;
}

/** Tambah koin (lot baru). false = ref sudah pernah dicatat (idempoten) atau jumlah 0. */
export async function grantCoins(
  userId: string,
  amount: number,
  kind: "SIGNUP" | "CASHBACK" | "REVIEW" | "REFUND" | "ADJUST",
  ref: string | null,
  opts: { note?: string; orderId?: string; client?: Tx | typeof db } = {},
): Promise<boolean> {
  if (amount <= 0) return false;
  const { expireDays } = await getCoinRules();
  try {
    await (opts.client ?? db).coinEntry.create({
      data: {
        userId,
        amount,
        kind,
        ref,
        note: opts.note,
        orderId: opts.orderId,
        remaining: amount,
        expiresAt: new Date(Date.now() + expireDays * DAY),
      },
    });
    return true;
  } catch (e) {
    if (isDuplicate(e)) return false;
    throw e;
  }
}

/** Kurangi lot FIFO sebanyak `amount` (atau sebisanya bila `partial`). Mengembalikan jumlah terpotong. */
async function consume(tx: Tx, userId: string, amount: number, partial: boolean): Promise<number> {
  const lots = await tx.coinEntry.findMany({
    where: liveLots(userId),
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, remaining: true },
  });
  let left = amount;
  for (const lot of lots) {
    if (left <= 0) break;
    const take = Math.min(lot.remaining, left);
    // Bersyarat: bila pesanan lain memakai lot yang sama bersamaan, update ini gagal → batal.
    const r = await tx.coinEntry.updateMany({
      where: { id: lot.id, remaining: { gte: take } },
      data: { remaining: { decrement: take } },
    });
    if (r.count !== 1) throw new Error("Saldo koin berubah. Coba lagi.");
    left -= take;
  }
  if (left > 0 && !partial) throw new Error("Saldo koin tidak cukup.");
  return amount - left;
}

/** Pakai koin untuk pesanan (di dalam transaksi pembuatan pesanan). */
export async function spendCoins(tx: Tx, userId: string, amount: number, orderId: string) {
  if (amount <= 0) return;
  await consume(tx, userId, amount, false);
  await tx.coinEntry.create({
    data: { userId, amount: -amount, kind: "SPEND", ref: `spend:${orderId}`, orderId, note: "Dipakai untuk pesanan" },
  });
}

/** Bonus akun baru — sekali per akun (dipanggil saat saldo pertama kali dibaca). */
export async function ensureSignupBonus(userId: string) {
  const rules = await getCoinRules();
  if (!rules.enabled) return false;
  return grantCoins(userId, rules.signupBonus, "SIGNUP", `signup:${userId}`, { note: "Bonus member baru" });
}

type OrderForCoins = { id: string; userId: string | null; total: number; shippingCost: number; coinsUsed: number; midtransOrderId?: string | null };

/** Cashback 2% saat pesanan Selesai (atau otomatis setelah masa tunggu, lihat cron koin). */
export async function grantOrderCashback(order: OrderForCoins): Promise<number> {
  if (!order.userId) return 0;
  const amount = cashbackFor(order.total - order.shippingCost, await getCoinRules());
  const ok = await grantCoins(order.userId, amount, "CASHBACK", `cashback:${order.id}`, {
    orderId: order.id,
    note: `Cashback pesanan ${order.midtransOrderId ?? ""}`.trim(),
  });
  return ok ? amount : 0;
}

/** Pesanan batal: kembalikan koin terpakai & tarik cashback yang sudah diberikan (sisa saldo). */
export async function reverseOrderCoins(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, coinsUsed: true, midtransOrderId: true },
  });
  if (!order?.userId) return;
  const userId = order.userId;
  if (order.coinsUsed > 0) {
    await grantCoins(userId, order.coinsUsed, "REFUND", `refund:${order.id}`, {
      orderId: order.id,
      note: `Pengembalian koin, pesanan ${order.midtransOrderId ?? ""} dibatalkan`.trim(),
    });
  }
  const cashback = await db.coinEntry.findUnique({ where: { ref: `cashback:${order.id}` } });
  if (cashback) {
    try {
      await db.$transaction(async (tx) => {
        const taken = await consume(tx, userId, cashback.amount, true);
        await tx.coinEntry.create({
          data: { userId, amount: -taken, kind: "REVOKE", ref: `revoke:${order.id}`, orderId: order.id, note: "Cashback ditarik, pesanan dibatalkan" },
        });
      });
    } catch (e) {
      if (!isDuplicate(e)) throw e;
    }
  }
}

/** Bonus ulasan disetujui (hanya ulasan dari pesanan member). */
export async function grantReviewBonus(reviewId: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { orderId: true } });
  if (!review?.orderId) return false;
  const order = await db.order.findUnique({ where: { id: review.orderId }, select: { userId: true } });
  if (!order?.userId) return false;
  const rules = await getCoinRules();
  if (!rules.enabled) return false;
  return grantCoins(order.userId, rules.reviewBonus, "REVIEW", `review:${reviewId}`, { orderId: review.orderId, note: "Bonus ulasan" });
}

/** Koreksi manual admin (+/−). Minus memotong saldo yang ada (tak bisa di bawah 0). */
export async function adjustCoins(userId: string, amount: number, note: string) {
  if (amount > 0) return grantCoins(userId, amount, "ADJUST", null, { note });
  await db.$transaction(async (tx) => {
    const taken = await consume(tx, userId, -amount, true);
    if (taken > 0) await tx.coinEntry.create({ data: { userId, amount: -taken, kind: "ADJUST", note } });
  });
  return true;
}

/** Hanguskan sisa lot yang lewat tanggal → baris EXPIRE. Mengembalikan jumlah lot. */
export async function expireCoinLots(now = new Date()): Promise<number> {
  const lots = await db.coinEntry.findMany({
    where: { remaining: { gt: 0 }, expiresAt: { lte: now } },
    select: { id: true, userId: true, remaining: true },
    take: 500,
  });
  for (const lot of lots) {
    await db.$transaction(async (tx) => {
      const r = await tx.coinEntry.updateMany({ where: { id: lot.id, remaining: lot.remaining }, data: { remaining: 0 } });
      if (r.count !== 1) return;
      await tx.coinEntry.create({
        data: { userId: lot.userId, amount: -lot.remaining, kind: "EXPIRE", ref: `expire:${lot.id}`, note: "Koin hangus" },
      });
    });
  }
  return lots.length;
}
