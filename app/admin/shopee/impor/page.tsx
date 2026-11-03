import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ShopeeImport } from "@/components/admin/shopee-import";

export const dynamic = "force-dynamic";
// Impor menyalin foto ke CDN per produk → beri waktu cukup (server action ikut batas halaman ini).
export const maxDuration = 300;
export const metadata = { title: "Impor dari Shopee — Admin SNAPFIT" };

export default function ShopeeImportPage() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/admin/produk" className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Impor Produk dari Shopee</h1>
      </div>
      <p className="mt-2 mb-6 max-w-2xl text-sm text-muted-foreground">
        Ambil listing Shopee <b>apa adanya</b> — judul, deskripsi, foto &amp; varian — dari file Ubah Massal Seller Center
        (mis. listing “[BUY 1 GET 1] …” yang di Ginee menumpang di produk biasa). SKU sama dengan Ginee → stok ikut gudang
        Ginee &amp; pesanan web tetap masuk Ginee.
      </p>
      <ShopeeImport />
    </div>
  );
}
