import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Klik tombol linktree: hitung klik lalu redirect ke URL tujuan.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const link = await db.bioLink
    .update({ where: { id }, data: { clicks: { increment: 1 } }, select: { url: true, active: true } })
    .catch(() => null);
  if (!link || !link.active) return NextResponse.redirect(new URL("/links", req.url));
  return NextResponse.redirect(new URL(link.url, req.url), 302);
}
