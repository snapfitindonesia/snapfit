import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, abandonedCartEmail } from "@/lib/email";
import { normalizeEmail, normalizePhone, restoreUrl, sellableDraftItems, type DraftLine } from "@/lib/cart-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pengingat keranjang ditinggal: draf checkout ber-email yang tak jadi pesanan
// 1 jam–3 hari lalu → email sekali. Cron harian 20:00 WIB (Hobby: harian saja).
const MIN_AGE_H = 1;
const MAX_AGE_D = 3;
const KEEP_DAYS = 60;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");

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
  // Retensi: draf > 60 hari dihapus (data kontak tak disimpan selamanya).
  const purged = await db.checkoutDraft.deleteMany({ where: { updatedAt: { lt: new Date(now - KEEP_DAYS * 86_400_000) } } });
  // Kata kunci pencarian yang cuma sekali dicari & sudah > 90 hari → buang (jaga tabel ringkas).
  await db.searchTerm.deleteMany({ where: { count: { lte: 1 }, lastAt: { lt: new Date(now - 90 * 86_400_000) } } });
  const drafts = await db.checkoutDraft.findMany({
    where: {
      email: { not: null },
      remindedAt: null,
      convertedAt: null,
      updatedAt: { lte: new Date(now - MIN_AGE_H * 3_600_000), gte: new Date(now - MAX_AGE_D * 86_400_000) },
    },
    orderBy: { updatedAt: "asc" },
    take: 50,
  });
  if (!drafts.length) return NextResponse.json({ ok: true, candidates: 0, sent: 0, purged: purged.count });

  // Pengaman ganda: kontak yang sudah memesan sejak draf dibuat → lewati.
  const [optOuts, orders] = await Promise.all([
    db.emailOptOut.findMany({ where: { email: { in: drafts.map((d) => d.email!) } }, select: { email: true } }),
    db.order.findMany({
      where: { createdAt: { gte: new Date(now - (MAX_AGE_D + 1) * 86_400_000) } },
      select: { address: true, createdAt: true },
    }),
  ]);
  const optedOut = new Set(optOuts.map((o) => o.email));
  const ordered = orders.map((o) => {
    const a = (o.address ?? {}) as { email?: string; phone?: string };
    return { email: normalizeEmail(a.email), phone: normalizePhone(a.phone), at: o.createdAt };
  });

  let sent = 0;
  let skipped = 0;
  for (const d of drafts) {
    const done = () => db.checkoutDraft.update({ where: { id: d.id }, data: { remindedAt: new Date() } });
    const hasOrdered = ordered.some((o) => o.at >= d.createdAt && ((d.email && o.email === d.email) || (d.phone && o.phone === d.phone)));
    const items = optedOut.has(d.email!) || hasOrdered ? [] : await sellableDraftItems((d.items as DraftLine[]) ?? []);
    if (!items.length) {
      // Sudah pesan / minta berhenti / produk habis → tandai agar tak dicek ulang.
      await done();
      skipped++;
      continue;
    }
    try {
      await sendEmail({
        to: d.email!,
        ...abandonedCartEmail({
          name: d.name,
          items,
          restoreUrl: restoreUrl(d.token),
          optOutUrl: `${SITE}/berhenti?t=${d.token}`,
        }),
      });
      await done();
      sent++;
    } catch (e) {
      console.error("Pengingat keranjang gagal:", d.id, e);
    }
  }
  return NextResponse.json({ ok: true, candidates: drafts.length, sent, skipped, purged: purged.count });
}
