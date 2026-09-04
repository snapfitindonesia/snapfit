import { db } from "@/lib/db";
import { VoucherManager } from "@/components/admin/voucher-manager";

export const dynamic = "force-dynamic";

export default async function AdminVoucherPage() {
  const vouchers = await db.voucher.findMany({ orderBy: { code: "asc" } });
  return (
    <div>
      <h1 className="text-xl font-semibold">Voucher</h1>
      <div className="mt-6">
        <VoucherManager vouchers={vouchers} />
      </div>
    </div>
  );
}
