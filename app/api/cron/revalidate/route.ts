import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ARTICLES_TAG } from "@/lib/articles";
import { HOME_TAG } from "@/lib/home/data";

export const dynamic = "force-dynamic";

// Segarkan cache konten setelah data diubah lewat skrip (bukan lewat admin). Diamankan CRON_SECRET.
// POST /api/cron/revalidate  (Authorization: Bearer <CRON_SECRET>)
const TAGS = [HOME_TAG, ARTICLES_TAG];
const PATHS = ["/", "/artikel"];

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  for (const t of TAGS) revalidateTag(t);
  for (const p of PATHS) revalidatePath(p);
  revalidatePath("/artikel/[slug]", "page");
  return NextResponse.json({ ok: true, tags: TAGS, paths: PATHS });
}
