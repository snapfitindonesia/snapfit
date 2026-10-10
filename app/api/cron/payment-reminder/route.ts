import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, paymentReminderEmail } from "@/lib/email";
import { withItemImages } from "@/lib/email-items";
import { isManualPayment } from "@/lib/payment";
import { getBankAccounts } from "@/lib/bank-settings";
import { expireUnpaidOrders } from "@/lib/orders/expire";
import { staleBackupWarning } from "@/lib/backup";
import { alertAdmin } from "@/lib/admin-alert";
import { PENDING_EXPIRE_DAYS } from "@/lib/validations/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1) Pesanan PENDING > PENDING_EXPIRE_DAYS hari → dibatalkan otomatis (semua mode bayar), koin kembali.
// 2) Pengingat bayar (transfer manual): pesanan PENDING ≥ 2 jam yang belum pernah diingatkan → email sekali. Dipicu Vercel Cron harian
// 19:00 WIB (Hobby hanya boleh cron harian). Diamankan CRON_SECRET.
const MIN_AGE_H = 2;
const MAX_AGE_D = PENDING_EXPIRE_DAYS;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // Penjaga backup: dicek dari cron LAIN, karena cron backup yang berhenti jalan tak bisa melapor sendiri.
  const backupWarning = await staleBackupWarning().catch((e) => `Tidak bisa memeriksa backup: ${e instanceof Error ? e.message : e}`);
  if (backupWarning) {
    await alertAdmin("Backup database terlambat", "Backup harian tidak berjalan", [
      backupWarning,
      "Cek Vercel → Cron Jobs (db-backup) & log-nya. Data toko belum terlindungi backup terbaru.",
    ]);
  }

  const expired = await expireUnpaidOrders();
  if (!isManualPayment()) return NextResponse.json({ ok: true, backupWarning, expired, reminder: "bukan mode transfer manual" });

  const now = Date.now();
  const orders = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentReminderAt: null,
      createdAt: { lte: new Date(now - MIN_AGE_H * 3_600_000), gte: new Date(now - MAX_AGE_D * 86_400_000) },
    },
    include: { items: true },
    take: 50,
  });

  let sent = 0;
  for (const order of orders) {
    const email = (order.address as { email?: string } | null)?.email;
    if (!email) continue;
    try {
      await sendEmail({ to: email, ...paymentReminderEmail(order, await withItemImages(order.items), await getBankAccounts()) });
      await db.order.update({ where: { id: order.id }, data: { paymentReminderAt: new Date() } });
      sent++;
    } catch (e) {
      console.error("Pengingat bayar gagal:", order.midtransOrderId, e);
    }
  }
  return NextResponse.json({ ok: true, backupWarning, expired, candidates: orders.length, sent });
}
