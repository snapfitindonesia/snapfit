import { NextResponse } from "next/server";
import { getProducts } from "@/lib/actions/product";
import { productQuerySchema } from "@/lib/validations/product";

// AJAX endpoint listing produk — dipakai filter tipe HP, sort, dan "load more"
// dari Client Component tanpa reload halaman (lihat docs/01-arsitektur.md).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = productQuerySchema.safeParse({
    tipe: searchParams.get("tipe") ?? undefined,
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
  return NextResponse.json(result);
}
