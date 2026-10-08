"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BankAccount } from "@/lib/bank-accounts";
import { saveBankAccounts } from "@/lib/actions/bank";

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BANKS = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Danamon", "SeaBank", "Jago", "blu by BCA Digital"];

export function BankAccountsForm({ initial }: { initial: BankAccount[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<BankAccount[]>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (i: number, p: Partial<BankAccount>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const move = (i: number, d: -1 | 1) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveBankAccounts(rows);
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: "Tersimpan. Rekening baru langsung tampil di checkout, halaman pesanan & email." } : { ok: false, text: res.error ?? "Gagal menyimpan." });
    if (res.ok) {
      // Tampilkan nomor seperti tersimpan (hanya angka; spasi/strip dibuang).
      setRows((r) => r.map((x) => ({ ...x, accountNumber: x.accountNumber.replace(/[^\d]/g, "") })));
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <datalist id="bank-names">
        {BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      {rows.map((r, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">
              Rekening {i + 1} {i === 0 && <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">utama</span>}
            </p>
            <div className="flex gap-1">
              <button type="button" aria-label="Naik" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-7 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-30">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" aria-label="Turun" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="grid size-7 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-30">
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="Hapus"
                disabled={rows.length === 1}
                onClick={() => setRows((x) => x.filter((_, k) => k !== i))}
                className="grid size-7 place-items-center rounded-md border border-border hover:bg-muted disabled:opacity-30"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              Bank
              <input className={`mt-1 ${input}`} list="bank-names" value={r.bank} onChange={(e) => set(i, { bank: e.target.value })} placeholder="BCA" />
            </label>
            <label className="block text-sm">
              Nomor rekening
              <input className={`mt-1 ${input} font-mono`} inputMode="numeric" value={r.accountNumber} onChange={(e) => set(i, { accountNumber: e.target.value })} placeholder="1234567890" />
            </label>
            <label className="block text-sm">
              Atas nama
              <input className={`mt-1 ${input}`} value={r.accountName} onChange={(e) => set(i, { accountName: e.target.value })} placeholder="Nama pemilik rekening" />
            </label>
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        {rows.length < 4 && (
          <Button type="button" variant="outline" onClick={() => setRows((r) => [...r, { bank: "", accountNumber: "", accountName: "" }])}>
            <Plus className="size-4" /> Tambah rekening
          </Button>
        )}
        <Button type="button" onClick={save} disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />} Simpan
        </Button>
      </div>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-destructive"}`}>{msg.text}</p>}
    </div>
  );
}
