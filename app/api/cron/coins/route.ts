import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, coinExpiryEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { expireCoinLots, getCoinBalance, grantOrderCashback } from "@/lib/coins";
import { getCoinRules } from "@/lib/coins-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Koin member, harian 09:00 WIB (Vercel Cron; diamankan CRON_SECRET):
// 1) cashback otomatis untuk pesanan member yang sudah Dikirim ≥ x hari (admin lupa tandai Selesai);
// 2) hanguskan lot yang lewat tanggal;
// 3) email pengingat sekali per lot untuk koin yang hangus ≤ x hari lagi.
// x = Admin → Koin Member (lib/coins-settings.ts).
const DAY = 86_400_000;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now();
  const rules = await getCoinRules();

  // 1) Cashback otomatis (idempoten: ref "cashback:<orderId>")
  const shipped = await db.order.findMany({
    where: { userId: { not: null }, status: { in: ["SHIPPED", "DONE"] }, shippedAt: { lte: new Date(now - rules.autoDoneDays * DAY) } },
    select: { id: true, userId: true, total: true, shippingCost: true, coinsUsed: true, midtransOrderId: true },
    take: 200,
  });
  const done = await db.coinEntry.findMany({
    where: { ref: { in: shipped.map((o) => `cashback:${o.id}`) } },
    select: { ref: true },
  });
  const paid = new Set(done.map((d) => d.ref));
  let cashbacks = 0;
  for (const o of shipped) {
    if (paid.has(`cashback:${o.id}`)) continue;
    if (await grantOrderCashback(o)) cashbacks++;
  }

  // 2) Hangus
  const expired = await expireCoinLots(new Date(now));

  // 3) Pengingat H-7 (satu email per user, lot ditandai agar tak dikirim ulang)
  const soon = !rules.expireNoticeDays ? [] : await db.coinEntry.findMany({
    where: { remaining: { gt: 0 }, notifiedAt: null, expiresAt: { gt: new Date(now), lte: new Date(now + rules.expireNoticeDays * DAY) } },
    select: { id: true, userId: true, remaining: true, expiresAt: true },
    take: 500,
  });
  const byUser = new Map<string, typeof soon>();
  for (const l of soon) byUser.set(l.userId, [...(byUser.get(l.userId) ?? []), l]);

  const admin = createSupabaseAdminClient();
  const optOuts = new Set((await db.emailOptOut.findMany({ select: { email: true } })).map((o) => o.email));
  let reminded = 0;
  for (const [userId, lots] of byUser) {
    let email: string | undefined;
    try {
      email = admin ? (await admin.auth.admin.getUserById(userId)).data.user?.email ?? undefined : undefined;
    } catch {
      email = undefined;
    }
    if (email && !optOuts.has(email.toLowerCase())) {
      try {
        const amount = lots.reduce((n, l) => n + l.remaining, 0);
        const expiresAt = lots.reduce((d, l) => (l.expiresAt! < d ? l.expiresAt! : d), lots[0].expiresAt!);
        await sendEmail({ to: email, ...coinExpiryEmail({ amount, expiresAt, balance: await getCoinBalance(userId), rules }) });
        reminded++;
      } catch (e) {
        console.error("Email koin hangus gagal:", e);
        continue; // coba lagi besok
      }
    }
    await db.coinEntry.updateMany({ where: { id: { in: lots.map((l) => l.id) } }, data: { notifiedAt: new Date() } });
  }

  return NextResponse.json({ ok: true, cashbacks, expired, reminded });
}
