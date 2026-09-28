import { db } from "@/lib/db";
import { FLAT_SHIPPING_COST, FREE_SHIPPING_MAX, FREE_SHIPPING_MIN, isFlatShipping } from "@/lib/payment";
import { formatRupiah } from "@/lib/format";
import { ShippingZoneManager } from "@/components/admin/shipping-zone-manager";

export const dynamic = "force-dynamic";

export default async function AdminOngkirPage() {
  const zones = await db.shippingZone.findMany();
  return (
    <div>
      <h1 className="text-xl font-semibold">Ongkir per Provinsi</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tarif ke tiap provinsi tujuan, dihitung per berat (dibulatkan ke atas per kg, min. 1 kg): <b>1 kg pertama</b> +{" "}
        <b>tambahan per kg berikutnya</b>. Provinsi yang dikosongkan memakai tarif flat {formatRupiah(FLAT_SHIPPING_COST)}.
        {" "}Hapus centang <b>Dilayani</b> bila tidak ada kurir ke provinsi tsb — pembeli tidak bisa checkout ke sana.
        {FREE_SHIPPING_MIN > 0 && (
          <> Gratis ongkir berlaku untuk belanja min. {formatRupiah(FREE_SHIPPING_MIN)}{FREE_SHIPPING_MAX > 0 && <>, potongan maks. {formatRupiah(FREE_SHIPPING_MAX)}</>}.</>
        )}
      </p>
      {!isFlatShipping() && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          Mode Biteship sedang aktif — tabel ini tidak dipakai sampai kembali ke mode flat.
        </p>
      )}
      <div className="mt-6">
        <ShippingZoneManager
          flatCost={FLAT_SHIPPING_COST}
          initial={zones.map((z) => ({ provinceCode: z.provinceCode, baseCost: String(z.baseCost), perKg: z.perKg ? String(z.perKg) : "", etd: z.etd, available: z.available }))}
        />
      </div>
    </div>
  );
}
