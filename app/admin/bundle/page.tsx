import { getBundleConfig, loadBundleItems } from "@/lib/bundles";
import { BundleEditor } from "@/components/admin/bundle-editor";

export const dynamic = "force-dynamic";

export default async function AdminBundlePage() {
  const config = await getBundleConfig();
  const items = await loadBundleItems(config.variantIds);
  return (
    <div>
      <h1 className="text-xl font-semibold">Bundle Keranjang</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Produk rekomendasi &quot;Sering dibeli bersama&quot; di keranjang samping — pembeli menambahkannya dengan satu klik. Pilih
        varian spesifik (mis. warna/tipe tertentu). Harga coret mengikuti diskon aktif di Admin → Diskon.
      </p>
      <div className="mt-6">
        <BundleEditor config={config} items={items} />
      </div>
    </div>
  );
}
