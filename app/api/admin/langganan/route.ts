import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

// Unduh daftar pelanggan newsletter (Admin → Langganan Email) sebagai CSV.
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const rows = await db.subscriber.findMany({ orderBy: { createdAt: "asc" } });
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = ["email,sumber,tanggal", ...rows.map((r) => [q(r.email), q(r.source), r.createdAt.toISOString()].join(","))].join("\n");
  return new NextResponse(`﻿${csv}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="langganan-snapfit-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
