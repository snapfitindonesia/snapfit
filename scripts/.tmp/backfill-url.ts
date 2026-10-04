import { db } from "@/lib/db";
import { slugForName } from "@/lib/product-url-server";
async function main() {
  const products = await db.product.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, slug: true, name: true, shortId: true, legacySlug: true } });
  let n = 1000, changed = 0;
  for (const p of products) {
    const shortId = p.shortId ?? ++n;
    if (p.shortId) n = Math.max(n, p.shortId);
    const legacySlug = p.legacySlug ?? p.slug;
    const slug = await slugForName(p.name, p.id);
    await db.product.update({ where: { id: p.id }, data: { shortId, legacySlug, slug } });
    if (slug !== p.slug) changed++;
  }
  const dup = await db.$queryRawUnsafe<{ c: bigint }[]>(`select count(*)::bigint c from (select "shortId" from "Product" group by "shortId" having count(*)>1) t`);
  const ex = await db.product.findMany({ take: 3, orderBy: { shortId: "asc" }, select: { shortId: true, slug: true, legacySlug: true } });
  console.log("produk:", products.length, "| teks URL berubah (judul sudah diedit):", changed, "| shortId ganda:", String(dup[0].c));
  ex.forEach((e) => console.log(" ", e.shortId, e.slug === e.legacySlug ? "(teks sama)" : `(lama: ${e.legacySlug})`, e.slug));
}
main().finally(() => process.exit(0));
