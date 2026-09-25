import { db } from "@/lib/db";
import { MerekManager, type MerekRow } from "@/components/admin/merek-manager";

export const dynamic = "force-dynamic";

export default async function AdminMerekPage() {
  const merek = await db.merek.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
  // Hitung produk per merek (by nama, karena Product.brand simpan nama).
  const products = await db.product.findMany({ select: { brand: true } });
  const countByName = new Map<string, number>();
  for (const p of products) if (p.brand) countByName.set(p.brand, (countByName.get(p.brand) ?? 0) + 1);

  const rows: MerekRow[] = merek.map((m) => ({
    id: m.id,
    name: m.name,
    order: m.order,
    productCount: countByName.get(m.name) ?? 0,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Merek</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Daftar merek aksesori (SNAPFIT, Ringke, Araree, dll). Saat tambah/edit produk, merek dipilih dari daftar ini.
      </p>
      <div className="mt-6">
        <MerekManager rows={rows} />
      </div>
    </div>
  );
}
