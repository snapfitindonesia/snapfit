"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { saveVoucher, deleteVoucher } from "@/lib/actions/admin";

type Voucher = {
  id: string;
  code: string;
  type: string;
  amount: number;
  minPurchase: number;
  maxBenefit: number;
  active: boolean;
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BLANK = { code: "", type: "POTONGAN", amount: "0", minPurchase: "0", maxBenefit: "0", active: true };

export function VoucherManager({ vouchers }: { vouchers: Voucher[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setEditId(null); setF({ ...BLANK }); setError(null); };
  const edit = (v: Voucher) => { setEditId(v.id); setF({ code: v.code, type: v.type, amount: String(v.amount), minPurchase: String(v.minPurchase), maxBenefit: String(v.maxBenefit), active: v.active }); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveVoucher(
      { code: f.code.toUpperCase(), type: f.type as "POTONGAN" | "GRATIS_ONGKIR", amount: Number(f.amount), minPurchase: Number(f.minPurchase), maxBenefit: Number(f.maxBenefit), active: f.active },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus voucher ini?")) return;
    const res = await deleteVoucher(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit voucher" : "Voucher baru"}</h2>
        <label className="block text-sm">Kode
          <input className={`mt-1 ${input} uppercase`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="SNAP10K" required />
        </label>
        <label className="block text-sm">Tipe
          <select className={`mt-1 ${input}`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="POTONGAN">Potongan nominal</option>
            <option value="GRATIS_ONGKIR">Gratis ongkir</option>
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-sm">Nominal
            <input type="number" className={`mt-1 ${input}`} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </label>
          <label className="block text-sm">Min. beli
            <input type="number" className={`mt-1 ${input}`} value={f.minPurchase} onChange={(e) => setF({ ...f, minPurchase: e.target.value })} />
          </label>
          <label className="block text-sm">Max benefit
            <input type="number" className={`mt-1 ${input}`} value={f.maxBenefit} onChange={(e) => setF({ ...f, maxBenefit: e.target.value })} />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-foreground" /> Aktif
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {vouchers.map((v) => (
          <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="font-mono text-sm font-medium">{v.code}</span>
            <span className="text-xs text-muted-foreground">
              {v.type === "GRATIS_ONGKIR" ? "Gratis ongkir" : formatRupiah(v.amount)} · min {formatRupiah(v.minPurchase)}
            </span>
            {!v.active && <span className="text-xs text-muted-foreground">nonaktif</span>}
            <div className="ml-auto flex gap-3">
              <button onClick={() => edit(v)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
              <button onClick={() => del(v.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {vouchers.length === 0 && <p className="text-sm text-muted-foreground">Belum ada voucher.</p>}
      </div>
    </div>
  );
}
