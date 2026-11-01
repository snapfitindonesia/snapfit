import { db } from "@/lib/db";
import { getMegaMenu } from "@/lib/actions/product";
import { PromoPageEditor } from "@/components/admin/promo-page-editor";
import { PROMO_PAGE_KEY, parsePromoPage } from "@/lib/promo-page/config";

export const dynamic = "force-dynamic";

export default async function AdminPromoPage() {
  const [row, products, brands] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: PROMO_PAGE_KEY } }),
    db.product.findMany({ select: { id: true, name: true, archived: true }, orderBy: { name: "asc" } }),
    getMegaMenu(),
  ]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Halaman Buy 1 Get 1</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Atur halaman <b>/buy1get1</b>: klik bagian untuk mengedit, ubah urutan dengan panah, sembunyikan dengan ikon mata. Menu kategori di
        halaman otomatis mengikuti <b>Katalog → Kategori</b>. Perubahan tampil setelah klik <b>Simpan</b>.
      </p>
      <div className="mt-6">
        <PromoPageEditor initial={parsePromoPage(row?.value ?? undefined)} products={products} brands={brands.map((b) => ({ slug: b.slug, name: b.name }))} />
      </div>
    </div>
  );
}
