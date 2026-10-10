import { NextRequest, NextResponse } from "next/server";
import { backupLooksWrong, runBackup } from "@/lib/backup";
import { alertAdmin } from "@/lib/admin-alert";

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
    const wrong = backupLooksWrong(result.counts);
    if (wrong) {
      await alertAdmin("Backup database mencurigakan", "Isi backup harian tidak wajar", [
        `Backup ${result.key} tersimpan, tetapi ${wrong}.`,
        "Cek database & data toko segera. Backup lama (30 hari) masih tersimpan di R2.",
      ]);
    }
    return NextResponse.json({ ok: true, ...result, warning: wrong });
  } catch (e) {
    console.error("[db-backup] gagal:", e);
    // Vercel Hobby tak mengirim email saat cron gagal → beri tahu admin sendiri.
    await alertAdmin("Backup database GAGAL", "Backup harian database gagal", [
      `Error: ${e instanceof Error ? e.message : String(e)}`,
      "Backup berikutnya dicoba otomatis besok. Bila berulang, cek kunci R2 (R2_*) & bucket backup di Vercel.",
    ]);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "gagal" }, { status: 500 });
  }
}
