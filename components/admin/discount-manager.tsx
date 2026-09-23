"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { saveDiscount, deleteDiscount } from "@/lib/actions/admin";

type Variant = { id: string; name: string; price: number };
type Product = { id: string; name: string; variants: Variant[] };
type Discount = { id: string; name: string; percent: number; active: boolean; variantIds: string[] };

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

export function DiscountManager({ discounts, products }: { discounts: Discount[]; products: Product[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("10");
  const [active, setActive] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [openProd, setOpenProd] = useState<Record<string, boolean>>({});

  function reset() {
    setEditId(null); setName(""); setPercent("10"); setActive(true); setPicked([]); setError(null);
  }
  function edit(d: Discount) {
    setEditId(d.id); setName(d.name); setPercent(String(d.percent)); setActive(d.active); setPicked(d.variantIds); setError(null);
  }

  const pickedSet = useMemo(() => new Set(picked), [picked]);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleProduct = (prod: Product) => {
    const ids = prod.variants.map((v) => v.id);
    const allOn = ids.every((id) => pickedSet.has(id));
    setPicked((p) => (allOn ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]));
  };

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return kw ? products.filter((p) => p.name.toLowerCase().includes(kw)) : products;
  }, [q, products]);

  const variantLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) for (const v of p.variants) m.set(v.id, `${p.name} — ${v.name}`);
    return m;
  }, [products]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveDiscount({ name, percent: Number(percent), variantIds: picked, active }, editId ?? undefined);
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus diskon ini?")) return;
    const res = await deleteDiscount(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit diskon" : "Diskon baru"}</h2>
        <label className="block text-sm">Nama
          <input className={`mt-1 ${input}`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Promo iPhone 15 Pro" required />
        </label>
        <label className="block text-sm">Persen diskon
          <input type="number" min={1} max={99} className={`mt-1 ${input}`} value={percent} onChange={(e) => setPercent(e.target.value)} required />
        </label>

        <div className="text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span>Varian kena diskon <span className="text-muted-foreground">({picked.length} dipilih)</span></span>
          </div>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk…" className={`${input} py-1.5 pl-8 text-xs`} />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {filtered.map((p) => {
              const ids = p.variants.map((v) => v.id);
              const allOn = ids.length > 0 && ids.every((id) => pickedSet.has(id));
              const someOn = ids.some((id) => pickedSet.has(id));
              const open = openProd[p.id] ?? someOn;
              return (
                <div key={p.id} className="rounded border border-border/60">
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }} onChange={() => toggleProduct(p)} className="accent-foreground" />
                    <button type="button" onClick={() => setOpenProd((o) => ({ ...o, [p.id]: !open }))} className="flex flex-1 items-center gap-1 text-left">
                      <ChevronRight className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
                      <span className="line-clamp-1 text-xs font-medium">{p.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{p.variants.length} varian</span>
                    </button>
                  </div>
                  {open && (
                    <ul className="border-t border-border/60 px-2 py-1">
                      {p.variants.map((v) => (
                        <li key={v.id}>
                          <label className="flex items-center gap-2 py-0.5 text-xs">
                            <input type="checkbox" checked={pickedSet.has(v.id)} onChange={() => toggle(v.id)} className="accent-foreground" />
                            <span className="flex-1">{v.name}</span>
                            <span className="text-muted-foreground">{formatRupiah(v.price)}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && <p className="p-2 text-xs text-muted-foreground">Tak ada produk cocok.</p>}
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
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {d.variantIds.length
                ? `${d.variantIds.length} varian: ` + d.variantIds.map((id) => variantLabel.get(id) ?? "?").slice(0, 4).join(", ") + (d.variantIds.length > 4 ? ", …" : "")
                : "tanpa varian"}
            </p>
          </div>
        ))}
        {discounts.length === 0 && <p className="text-sm text-muted-foreground">Belum ada diskon.</p>}
      </div>
    </div>
  );
}
