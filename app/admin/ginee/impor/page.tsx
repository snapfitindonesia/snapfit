import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GineeImport } from "@/components/admin/ginee-import";
import { GineeSyncButton } from "@/components/admin/ginee-sync-button";
import { isGineeConfigured } from "@/lib/ginee/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Impor dari Ginee — Admin SNAPFIT" };

export default function GineeImportPage() {
  const configured = isGineeConfigured();

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/admin/produk" className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold">Impor Produk dari Ginee</h1>
        <span
          className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            configured ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          }`}
        >
          {configured ? "Tersambung" : "Belum dikonfigurasi"}
        </span>
      </div>

      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Cari produk master di Ginee lalu impor selektif ke toko web. Ginee tak menyimpan harga jual,
        jadi <b>isi harga</b> tiap produk sebelum impor (bisa disesuaikan lagi di editor produk).
        Stok & varian ikut otomatis.
      </p>

      {!configured ? (
        <p className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Kredensial Ginee belum diisi. Set <code>GINEE_ACCESS_KEY</code> & <code>GINEE_SECRET_KEY</code> di env.
        </p>
      ) : (
        <div className="mt-6">
          <div className="mb-6 rounded-lg border border-border bg-muted/30 p-4">
            <h2 className="text-sm font-semibold">Sinkron Stok</h2>
            <p className="mb-3 mt-0.5 text-xs text-muted-foreground">
              Tarik stok terkini dari Ginee untuk semua produk hasil impor. Berjalan otomatis tiap 6 jam;
              klik untuk sinkron manual sekarang.
            </p>
            <GineeSyncButton />
          </div>
          <GineeImport />
        </div>
      )}
    </div>
  );
}
