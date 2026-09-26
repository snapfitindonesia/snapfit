import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, paymentReminderEmail } from "@/lib/email";
import { isManualPayment, MANUAL_BANK } from "@/lib/payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pengingat bayar (transfer manual): pesanan PENDING ≥ 2 jam & ≤ 3 hari yang
// belum pernah diingatkan → kirim email sekali. Dipicu Vercel Cron harian
// 19:00 WIB (Hobby hanya boleh cron harian). Diamankan CRON_SECRET.
const MIN_AGE_H = 2;
const MAX_AGE_D = 3;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isManualPayment()) return NextResponse.json({ ok: true, skipped: "bukan mode transfer manual" });

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
      await sendEmail({ to: email, ...paymentReminderEmail(order, order.items, MANUAL_BANK) });
      await db.order.update({ where: { id: order.id }, data: { paymentReminderAt: new Date() } });
      sent++;
    } catch (e) {
      console.error("Pengingat bayar gagal:", order.midtransOrderId, e);
    }
  }
  return NextResponse.json({ ok: true, candidates: orders.length, sent });
}
