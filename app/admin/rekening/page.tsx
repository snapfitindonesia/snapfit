import { getBankAccountsFresh } from "@/lib/bank-settings";
import { BankAccountsForm } from "@/components/admin/bank-accounts-form";

export const dynamic = "force-dynamic";

export default async function AdminBankPage() {
  const accounts = await getBankAccountsFresh();
  return (
    <div>
      <h1 className="text-xl font-semibold">Rekening Transfer</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-muted-foreground">
        Rekening tujuan pembayaran transfer manual. Tampil di halaman checkout, halaman pesanan berhasil, lacak pesanan, dan email
        instruksi bayar/pengingat. Rekening paling atas = <b>utama</b>. Periksa ulang nomor rekening sebelum menyimpan.
      </p>
      <BankAccountsForm initial={accounts} />
    </div>
  );
}
