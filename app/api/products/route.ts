import { NextResponse } from "next/server";
import { getProducts } from "@/lib/actions/product";
import { productQuerySchema } from "@/lib/validations/product";

// AJAX endpoint listing produk — dipakai filter tipe HP, sort, dan "load more"
// dari Client Component tanpa reload halaman (lihat docs/01-arsitektur.md).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = productQuerySchema.safeParse({
    tipe: searchParams.get("tipe") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    skip: searchParams.get("skip") ?? undefined,
    take: searchParams.get("take") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Query tidak valid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await getProducts(parsed.data);
  return NextResponse.json(result, {
    headers: {
      // Cache di CDN Vercel per-URL (tipe/sort/q/skip): sajikan hasil 60 dtk,
      // + stale-while-revalidate 5 mnt → query berulang instan tanpa nyentuh Supabase.
      // Edit admin tetap tercermin dalam <=60 dtk.
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
