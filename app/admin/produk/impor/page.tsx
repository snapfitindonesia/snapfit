import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BulkImport } from "@/components/admin/bulk-import";

export const dynamic = "force-dynamic";

export default function ImportProductsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/produk" className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Impor Produk Massal</h1>
          <p className="text-sm text-muted-foreground">Buat banyak produk sekaligus dari CSV</p>
        </div>
      </div>
      <BulkImport />
    </div>
  );
}
