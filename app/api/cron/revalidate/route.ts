import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ARTICLES_TAG } from "@/lib/articles";
import { HOME_TAG } from "@/lib/home/data";
import { CATALOG_TAG } from "@/lib/catalog";
import { STOREFRONT_TAG } from "@/lib/storefront-cache";
import { PROMO_PAGE_PATH, PROMO_PAGE_TAG } from "@/lib/promo-page/config";

export const dynamic = "force-dynamic";

// Segarkan cache konten setelah data diubah lewat skrip (bukan lewat admin). Diamankan CRON_SECRET.
// POST /api/cron/revalidate  (Authorization: Bearer <CRON_SECRET>)
// Termasuk katalog/menu & halaman promo: produk atau pengaturan /buy1get1 yang diubah lewat skrip (bukan dashboard)
// tak memicu revalidateTag sendiri → daftar produk, menu & halaman produk bisa tertahan cache s/d 1 jam.
const TAGS = [HOME_TAG, ARTICLES_TAG, CATALOG_TAG, STOREFRONT_TAG, PROMO_PAGE_TAG];
const PATHS = ["/", "/artikel", "/produk", PROMO_PAGE_PATH];

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  for (const t of TAGS) revalidateTag(t);
  for (const p of PATHS) revalidatePath(p);
  revalidatePath("/artikel/[slug]", "page");
  revalidatePath("/produk/[slug]", "page");
  revalidatePath("/kategori/[slug]", "page");
  return NextResponse.json({ ok: true, tags: TAGS, paths: PATHS });
}
