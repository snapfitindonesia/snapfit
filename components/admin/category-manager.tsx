"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCategory, deleteCategory } from "@/lib/actions/admin";

export type CatNode = {
  id: string;
  name: string;
  slug: string;
  order: number;
  products: number;
  children: CatNode[];
};

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BLANK = { name: "", slug: "", parentId: "", order: "0" };

export function CategoryManager({ tree }: { tree: CatNode[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Daftar brand (induk) untuk dropdown "Induk".
  const brands = useMemo(() => tree.map((b) => ({ id: b.id, name: b.name })), [tree]);

  function reset() {
    setEditId(null);
    setF({ ...BLANK });
    setError(null);
  }
  function editNode(n: CatNode, parentId: string) {
    setEditId(n.id);
    setF({ name: n.name, slug: n.slug, parentId, order: String(n.order) });
    setError(null);
  }
  function addChildTo(brandId: string) {
    reset();
    setF({ ...BLANK, parentId: brandId });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveCategory(
      { name: f.name, slug: f.slug, parentId: f.parentId, order: Number(f.order) },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); }
    else setError(res.error ?? "Gagal menyimpan.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus kategori ini?")) return;
    const res = await deleteCategory(id);
    if (res.ok) router.refresh();
    else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Form */}
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit kategori" : "Kategori baru"}</h2>
        <label className="block text-sm">Nama
          <input className={`mt-1 ${input}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. iPhone / Apple" required />
        </label>
        <label className="block text-sm">Slug <span className="text-muted-foreground">(opsional, otomatis dari nama)</span>
          <input className={`mt-1 ${input}`} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="iphone" />
        </label>
        <label className="block text-sm">Induk (brand)
          <select className={`mt-1 ${input}`} value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
            <option value="">— Tanpa induk (jadi Brand) —</option>
            {brands.filter((b) => b.id !== editId).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">Urutan
          <input type="number" min={0} className={`mt-1 ${input}`} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}
          </Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      {/* Pohon */}
      <div className="space-y-2">
        {tree.map((brand) => (
          <div key={brand.id} className="rounded-lg border border-border">
            <div className="flex items-center gap-2 p-3">
              <span className="text-sm font-semibold">{brand.name}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">brand · {brand.slug}</span>
              {brand.products > 0 && <span className="text-[10px] text-muted-foreground">{brand.products} produk</span>}
              <div className="ml-auto flex items-center gap-3">
                <button onClick={() => addChildTo(brand.id)} title="Tambah seri" className="text-muted-foreground hover:text-foreground"><Plus className="size-4" /></button>
                <button onClick={() => editNode(brand, "")} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                <button onClick={() => del(brand.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </div>
            </div>
            {brand.children.length > 0 && (
              <ul className="border-t border-border">
                {brand.children.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 border-b border-border/50 px-3 py-2 pl-6 last:border-0">
                    <span className="text-sm">{c.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{c.slug}</span>
                    {c.products > 0 && <span className="text-[10px] text-muted-foreground">{c.products} produk</span>}
                    <div className="ml-auto flex items-center gap-3">
                      <button onClick={() => editNode(c, brand.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                      <button onClick={() => del(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {tree.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kategori. Tambah brand dulu (tanpa induk).</p>}
      </div>
    </div>
  );
}
