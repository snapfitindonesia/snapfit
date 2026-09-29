import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, reviewRequestEmail, emailImage } from "@/lib/email";
import { ensureReviewToken, reviewUrl } from "@/lib/review-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ~7 hari setelah dikirim, kirim email ajakan ulas (sekali per pesanan).
// Dipicu Vercel Cron harian (lihat vercel.json). Diamankan CRON_SECRET.
const DAYS = 7;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron mengirim header Authorization: Bearer <CRON_SECRET> bila env diset.
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  // Tanpa secret: hanya boleh saat dev (fail-closed di produksi).
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  const orders = await db.order.findMany({
    where: {
      status: { in: ["SHIPPED", "DONE"] },
      shippedAt: { lte: cutoff },
      reviewRequestedAt: null,
    },
    include: { items: true },
    take: 100,
  });

  let sent = 0;
  for (const order of orders) {
    const email = (order.address as { email?: string } | null)?.email;

    // Tautan form ulasan pesanan ini (/ulasan/<token>#p-<slug> per produk)
    const url = reviewUrl(await ensureReviewToken(order));
    const variantIds = order.items.map((i) => i.variantId);
    const variants = await db.variant.findMany({
      where: { id: { in: variantIds } },
      select: { image: true, product: { select: { name: true, slug: true, coverImage: true } } },
    });
    const seen = new Set<string>();
    const productLinks = variants
      .filter((v) => v.product && !seen.has(v.product.slug) && seen.add(v.product.slug))
      .map((v) => ({ name: v.product.name, url: `${url}#p-${v.product.slug}`, image: emailImage(v.image || v.product.coverImage) }));

    if (email) {
      try {
        await sendEmail({ to: email, ...reviewRequestEmail(order, productLinks) });
        sent++;
      } catch (e) {
        console.error(`Email ajakan ulas gagal (order ${order.id}):`, e);
        continue; // jangan tandai terkirim bila gagal
      }
    }

    // Tandai agar tak dikirim ulang (juga bila tanpa email, agar tak menumpuk)
    await db.order.update({
      where: { id: order.id },
      data: { reviewRequestedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, candidates: orders.length, emailsSent: sent });
}
