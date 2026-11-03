// Tambah produk ke /buy1get1 dari impor (Ginee "Impor sebagai produk Buy 1 Get 1", impor file Shopee) — server.
import { revalidatePath, revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { CATALOG_TAG } from "@/lib/catalog";
import { DEFAULT_PROMO_PAGE, PROMO_PAGE_KEY, PROMO_PAGE_PATH, PROMO_PAGE_TAG, parsePromoPage } from "@/lib/promo-page/config";

export const MAX_PROMO_PRODUCTS = 48; // = batas productIds di lib/promo-page/config.ts

/** Produk Buy 1 Get 1 dikenali dari judulnya ("… — Buy 1 Get 1", "[BUY 1 GET 1] …"). */
export const PROMO_NAME = "Buy 1 Get 1";
export const promoNameWhere = (promo: boolean): Prisma.ProductWhereInput =>
  promo
    ? { name: { contains: PROMO_NAME, mode: "insensitive" } }
    : { NOT: { name: { contains: PROMO_NAME, mode: "insensitive" } } };

async function readPromoConfig() {
  const raw = (await db.siteSetting.findUnique({ where: { key: PROMO_PAGE_KEY } }))?.value ?? null;
  const c = parsePromoPage(raw ?? undefined);
  // Data tersimpan tak terbaca → jangan timpa pengaturan halaman dengan bawaan.
  if (raw && c === DEFAULT_PROMO_PAGE) throw new Error("pengaturan halaman promo tak terbaca");
  return c;
}

/** Sisa tempat produk di halaman /buy1get1 (dibaca langsung dari DB, bukan cache). */
export async function promoPageRoom(): Promise<number> {
  return MAX_PROMO_PRODUCTS - (await readPromoConfig()).products.productIds.length;
}

/** Tambahkan produk ke /buy1get1 sebagai "hanya di halaman promo". */
export async function addToPromoPage(ids: string[]): Promise<void> {
  const c = await readPromoConfig();
  const productIds = [...new Set([...c.products.productIds, ...ids])].slice(0, MAX_PROMO_PRODUCTS);
  const hiddenIds = [...new Set([...c.products.hiddenIds, ...ids])].filter((id) => productIds.includes(id));
  const value = { ...c, products: { ...c.products, productIds, hiddenIds } };
  await db.siteSetting.upsert({
    where: { key: PROMO_PAGE_KEY },
    create: { key: PROMO_PAGE_KEY, value: value as unknown as Prisma.InputJsonValue },
    update: { value: value as unknown as Prisma.InputJsonValue },
  });
  revalidateTag(PROMO_PAGE_TAG);
  revalidatePath(PROMO_PAGE_PATH);
  revalidateTag(CATALOG_TAG);
  revalidatePath("/produk/[slug]", "page");
}
