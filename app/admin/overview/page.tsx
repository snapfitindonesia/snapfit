import { getDefaultOverview } from "@/lib/overview";
import { OverviewEditor } from "@/components/admin/overview-editor";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const points = await getDefaultOverview();
  return (
    <div>
      <h1 className="text-xl font-semibold">Overview Produk</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Poin di bagian <b>Overview</b> halaman produk, berlaku untuk semua produk. Tulis 1 baris = 1 poin (maks. 10).
      </p>
      <div className="mt-6 max-w-xl">
        <OverviewEditor initial={points.join("\n")} />
      </div>
    </div>
  );
}
