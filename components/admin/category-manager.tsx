"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import { saveCategory, deleteCategory, reorderCategories } from "@/lib/actions/admin";

export type CatNode = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  order: number;
  products: number;
  children: CatNode[];
};
export type ParentOption = { id: string; label: string };

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BLANK = { name: "", slug: "", parentId: "", image: "", order: "0" };

export function CategoryManager({ tree, parentOptions }: { tree: CatNode[]; parentOptions: ParentOption[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<{ id: string; group: string } | null>(null);

  function reset() { setEditId(null); setF({ ...BLANK }); setError(null); }
  function editNode(n: CatNode, parentId: string) {
    setEditId(n.id);
    setF({ name: n.name, slug: n.slug, parentId, image: n.image ?? "", order: String(n.order) });
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function addChildTo(parentId: string) {
    reset();
    setF({ ...BLANK, parentId });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveCategory(
      { name: f.name, slug: f.slug, parentId: f.parentId, image: f.image, order: Number(f.order) },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus kategori ini?")) return;
    const res = await deleteCategory(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  // Drag reorder dalam satu grup saudara (group = id induk, "root" utk brand).
  async function onDrop(group: string, siblings: CatNode[], targetId: string) {
    if (!drag || drag.group !== group || drag.id === targetId) { setDrag(null); return; }
    const ids = siblings.map((s) => s.id);
    const from = ids.indexOf(drag.id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) { setDrag(null); return; }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDrag(null);
    await reorderCategories(ids);
    router.refresh();
  }

  const Row = ({
    n, group, siblings, level, parentIdForEdit,
  }: { n: CatNode; group: string; siblings: CatNode[]; level: 1 | 2 | 3; parentIdForEdit: string }) => (
    <div
      draggable
      onDragStart={() => setDrag({ id: n.id, group })}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop(group, siblings, n.id)}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${drag?.id === n.id ? "opacity-40" : ""} ${level === 1 ? "font-semibold" : ""} hover:bg-accent/50`}
    >
      <GripVertical className="size-4 shrink-0 cursor-grab text-muted-foreground" />
      <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded border border-border bg-muted">
        {n.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={n.image} alt="" className="size-full object-cover" />
        )}
      </span>
      <span className="text-sm">{n.name}</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{n.slug}</span>
      {n.products > 0 && <span className="text-[10px] text-muted-foreground">{n.products} produk</span>}
      <div className="ml-auto flex items-center gap-2.5">
        {level < 3 && (
          <button onClick={() => addChildTo(n.id)} title="Tambah sub-kategori" className="text-muted-foreground hover:text-foreground"><Plus className="size-4" /></button>
        )}
        <button onClick={() => editNode(n, parentIdForEdit)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
        <button onClick={() => del(n.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit kategori" : "Kategori baru"}</h2>
        <label className="block text-sm">Nama
          <input className={`mt-1 ${input}`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="mis. iPhone 18" required />
        </label>
        <label className="block text-sm">Slug <span className="text-muted-foreground">(opsional)</span>
          <input className={`mt-1 ${input}`} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="otomatis dari nama" />
        </label>
        <label className="block text-sm">Induk
          <select className={`mt-1 ${input}`} value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
            <option value="">— Tanpa induk (Brand) —</option>
            {parentOptions.filter((p) => p.id !== editId).map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <div className="text-sm">Foto (mega menu)
          <div className="mt-1"><ImageInput value={f.image} onChange={(url) => setF({ ...f, image: url })} /></div>
        </div>
        <label className="block text-sm">Urutan
          <input type="number" min={0} className={`mt-1 ${input}`} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {tree.map((brand) => (
          <div key={brand.id} className="rounded-lg border border-border p-2">
            <Row n={brand} group="root" siblings={tree} level={1} parentIdForEdit="" />
            {brand.children.length > 0 && (
              <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                {brand.children.map((line) => (
                  <div key={line.id}>
                    <Row n={line} group={brand.id} siblings={brand.children} level={2} parentIdForEdit={brand.id} />
                    {line.children.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
                        {line.children.map((model) => (
                          <Row key={model.id} n={model} group={line.id} siblings={line.children} level={3} parentIdForEdit={line.id} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {tree.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kategori. Tambah brand dulu (tanpa induk).</p>}
      </div>
    </div>
  );
}
