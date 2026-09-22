import { NextRequest, NextResponse } from "next/server";
import { runGineeStockSync } from "@/lib/ginee/sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sinkron stok Ginee → web berkala (Vercel Cron, lihat vercel.json).
// Diamankan CRON_SECRET (sama seperti cron ajakan ulas).
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const res = await runGineeStockSync();
  return NextResponse.json(res);
}
