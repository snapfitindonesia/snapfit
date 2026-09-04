"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDiscount, deleteDiscount } from "@/lib/actions/admin";

type Discount = {
  id: string;
  name: string;
  percent: number;
  active: boolean;
  productIds: string[];
};
type Product = { id: string; name: string };

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

export function DiscountManager({
  discounts,
  products,
}: {
  discounts: Discount[];
  products: Product[];
}) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("10");
  const [active, setActive] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setEditId(null); setName(""); setPercent("10"); setActive(true); setPicked([]); setError(null);
  }
  function edit(d: Discount) {
    setEditId(d.id); setName(d.name); setPercent(String(d.percent)); setActive(d.active); setPicked(d.productIds);
  }
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveDiscount(
      { name, percent: Number(percent), productIds: picked, active },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus diskon ini?")) return;
    const res = await deleteDiscount(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit diskon" : "Diskon baru"}</h2>
        <label className="block text-sm">Nama
          <input className={`mt-1 ${input}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Promo Case iPhone" required />
        </label>
        <label className="block text-sm">Persen diskon
          <input type="number" min={1} max={99} className={`mt-1 ${input}`} value={percent} onChange={(e) => setPercent(e.target.value)} required />
        </label>
        <div className="text-sm">
          <p className="mb-1">Produk kena diskon</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} className="accent-foreground" />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-foreground" /> Aktif
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Persen berbeda per produk? Buat beberapa diskon terpisah.</p>
      </form>

      <div className="space-y-2">
        {discounts.map((d) => (
          <div key={d.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{d.name}</span>
              <span className="rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background">-{d.percent}%</span>
              {!d.active && <span className="text-xs text-muted-foreground">nonaktif</span>}
              <div className="ml-auto flex gap-3">
                <button onClick={() => edit(d)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                <button onClick={() => del(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.productIds.map((id) => nameById.get(id) ?? "?").join(", ") || "tanpa produk"}
            </p>
          </div>
        ))}
        {discounts.length === 0 && <p className="text-sm text-muted-foreground">Belum ada diskon.</p>}
      </div>
    </div>
  );
}
