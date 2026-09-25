"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveMerek, deleteMerek } from "@/lib/actions/admin";

export type MerekRow = { id: string; name: string; order: number; productCount: number };

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

export function MerekManager({ rows }: { rows: MerekRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() { setEditId(null); setName(""); setError(null); }
  function edit(r: MerekRow) { setEditId(r.id); setName(r.name); setError(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveMerek({ name, order: 0 }, editId ?? undefined);
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(r: MerekRow) {
    const msg = r.productCount > 0
      ? `Hapus merek "${r.name}"? ${r.productCount} produk akan jadi "Tanpa Merek".`
      : `Hapus merek "${r.name}"?`;
    if (!confirm(msg)) return;
    const res = await deleteMerek(r.id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit merek" : "Tambah merek"}</h2>
        <label className="block text-sm">Nama merek
          <input className={`mt-1 ${input}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. SNAPFIT, Ringke, Araree" required />
        </label>
        {editId && <p className="text-xs text-muted-foreground">Mengubah nama akan otomatis memperbarui produk yang memakai merek ini.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span className="text-sm font-medium">{r.name}</span>
            {r.productCount > 0 && <span className="text-xs text-muted-foreground">{r.productCount} produk</span>}
            <div className="ml-auto flex items-center gap-2.5">
              <button onClick={() => edit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
              <button onClick={() => del(r)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Belum ada merek. Tambah dulu di kiri.</p>}
      </div>
    </div>
  );
}
