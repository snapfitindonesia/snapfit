import { db } from "@/lib/db";
import { VoucherManager } from "@/components/admin/voucher-manager";

export const dynamic = "force-dynamic";

export default async function AdminVoucherPage() {
  const vouchers = await db.voucher.findMany({ orderBy: { code: "asc" } });
  return (
    <div>
      <h1 className="text-xl font-semibold">Voucher</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pembeli bisa memakai maks. 2 voucher sekaligus: satu <b>potongan</b> + satu <b>gratis ongkir</b>, asalkan keduanya
        dicentang <b>Bisa digabung</b>. Dua voucher potongan tidak pernah bisa digabung — pembeli memilih salah satu.
      </p>
      <div className="mt-6">
        <VoucherManager vouchers={vouchers} />
      </div>
    </div>
  );
}
