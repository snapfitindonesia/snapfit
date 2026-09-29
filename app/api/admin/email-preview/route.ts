import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { buildEmailSample, isEmailSampleKey } from "@/lib/email-samples";

export const dynamic = "force-dynamic";

// Pratinjau email untuk Admin → Email (dilindungi middleware /api/admin + requireAdmin).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const key = req.nextUrl.searchParams.get("t") ?? "";
  if (!isEmailSampleKey(key)) return NextResponse.json({ error: "template tidak dikenal" }, { status: 400 });
  const { html } = await buildEmailSample(key);
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
