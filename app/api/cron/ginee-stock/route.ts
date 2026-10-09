import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { runGineeStockSync } from "@/lib/ginee/sync";
import { CATALOG_TAG } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // katalog besar butuh waktu (banyak panggilan Ginee)

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
  // Stok/harga/arsip berubah → indeks katalog (daftar produk) disegarkan.
  if (res.ok && (res.stockUpdated || res.priceUpdated || ("archived" in res && res.archived) || ("restored" in res && res.restored))) revalidateTag(CATALOG_TAG);
  return NextResponse.json(res);
}
