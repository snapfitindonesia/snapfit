import { NextRequest, NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Backup DB harian ke R2 (privat). Dipicu Vercel Cron (vercel.json). Diamankan CRON_SECRET.
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) return req.headers.get("authorization") === `Bearer ${secret}`;
  return process.env.NODE_ENV !== "production";
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBackup();
    console.log("[db-backup] ok", result.key, result.bytes, "bytes");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[db-backup] gagal:", e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
