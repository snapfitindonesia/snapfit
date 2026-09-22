import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, reviewRequestEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ~7 hari setelah dikirim, kirim email ajakan ulas (sekali per pesanan).
// Dipicu Vercel Cron harian (lihat vercel.json). Diamankan CRON_SECRET.
const DAYS = 7;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id";

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

    // Tautan halaman produk yang dibeli (untuk ajakan ulas)
    const variantIds = order.items.map((i) => i.variantId);
    const variants = await db.variant.findMany({
      where: { id: { in: variantIds } },
      select: { product: { select: { name: true, slug: true } } },
    });
    const seen = new Set<string>();
    const productLinks = variants
      .map((v) => v.product)
      .filter((p) => p && !seen.has(p.slug) && seen.add(p.slug))
      .map((p) => ({ name: p!.name, url: `${SITE}/produk/${p!.slug}` }));

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
