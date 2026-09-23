"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveNavLink, deleteNavLink } from "@/lib/actions/admin";

export type NavLinkRow = {
  id: string;
  label: string;
  url: string;
  location: "HEADER" | "FOOTER";
  order: number;
  newTab: boolean;
  active: boolean;
};

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BLANK = { label: "", url: "", location: "HEADER" as "HEADER" | "FOOTER", order: "0", newTab: false, active: true };

export function NavLinkManager({ rows }: { rows: NavLinkRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() { setEditId(null); setF({ ...BLANK }); setError(null); }
  function edit(r: NavLinkRow) {
    setEditId(r.id);
    setF({ label: r.label, url: r.url, location: r.location, order: String(r.order), newTab: r.newTab, active: r.active });
    setError(null);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveNavLink(
      { label: f.label, url: f.url, location: f.location, order: Number(f.order), newTab: f.newTab, active: f.active },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus link ini?")) return;
    const res = await deleteNavLink(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  const header = rows.filter((r) => r.location === "HEADER");
  const footer = rows.filter((r) => r.location === "FOOTER");

  const list = (title: string, items: NavLinkRow[]) => (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
            <span className="text-sm font-medium">{r.label}</span>
            {r.newTab && <ExternalLink className="size-3 text-muted-foreground" />}
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{r.url}</span>
            {!r.active && <span className="text-[10px] text-muted-foreground">nonaktif</span>}
            <button onClick={() => edit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
            <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground">Belum ada link.</p>}
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit link" : "Link baru"}</h2>
        <label className="block text-sm">Label
          <input className={`mt-1 ${input}`} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="mis. Promo, Blog, Kontak" required />
        </label>
        <label className="block text-sm">URL
          <input className={`mt-1 ${input}`} value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="/grosir  atau  https://instagram.com/…" required />
        </label>
        <label className="block text-sm">Lokasi
          <select className={`mt-1 ${input}`} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value as "HEADER" | "FOOTER" })}>
            <option value="HEADER">Header (nav atas)</option>
            <option value="FOOTER">Footer</option>
          </select>
        </label>
        <label className="block text-sm">Urutan
          <input type="number" min={0} className={`mt-1 ${input}`} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.newTab} onChange={(e) => setF({ ...f, newTab: e.target.checked })} className="accent-foreground" /> Buka di tab baru
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-foreground" /> Aktif
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-5">
        {list("Header", header)}
        {list("Footer", footer)}
      </div>
    </div>
  );
}
