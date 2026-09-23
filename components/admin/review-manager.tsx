"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil, Star, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageInput } from "@/components/admin/image-input";
import { saveReview, deleteReview } from "@/lib/actions/admin";

export type ProductOption = { id: string; name: string };
export type ReviewRow = {
  id: string;
  productId: string;
  productName: string;
  author: string;
  image: string | null;
  rating: number;
  comment: string;
  createdAt: string; // ISO
};

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
const BLANK = { productId: "", author: "", image: "", rating: 5, comment: "", createdAt: "" };

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={onChange ? () => onChange(n) : undefined}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} bintang`}
        >
          <Star className={`size-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function ProductSearchSelect({
  products,
  value,
  onChange,
}: {
  products: ProductOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = products.find((p) => p.id === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? products.filter((p) => p.name.toLowerCase().includes(term)) : products;
    return list.slice(0, 50);
  }, [q, products]);

  return (
    <div ref={boxRef} className="relative mt-1">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQ(""); }}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none focus:border-foreground ${selected ? "" : "text-muted-foreground"}`}
      >
        <span className="line-clamp-1">{selected ? selected.name : "— pilih produk —"}</span>
        {selected ? (
          <X className="size-4 shrink-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange(""); }} />
        ) : (
          <Search className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-background shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama produk…"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onChange(p.id); setOpen(false); }}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${p.id === value ? "bg-muted font-medium" : ""}`}
              >
                {p.name}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Tidak ada produk cocok.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReviewManager({ products, rows }: { products: ProductOption[]; rows: ReviewRow[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() { setEditId(null); setF({ ...BLANK }); setError(null); }
  function edit(r: ReviewRow) {
    setEditId(r.id);
    setF({
      productId: r.productId,
      author: r.author,
      image: r.image ?? "",
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.slice(0, 10), // yyyy-mm-dd
    });
    setError(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await saveReview(
      { productId: f.productId, author: f.author, image: f.image, rating: f.rating, comment: f.comment, createdAt: f.createdAt },
      editId ?? undefined,
    );
    if (res.ok) { reset(); router.refresh(); } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }
  async function del(id: string) {
    if (!confirm("Hapus ulasan ini?")) return;
    const res = await deleteReview(id);
    if (res.ok) router.refresh(); else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="h-fit space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit ulasan" : "Ulasan baru"}</h2>
        <div className="block text-sm">Produk
          <ProductSearchSelect products={products} value={f.productId} onChange={(id) => setF({ ...f, productId: id })} />
        </div>
        <label className="block text-sm">Nama pengulas
          <input className={`mt-1 ${input}`} value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} placeholder="mis. Rina S." required />
        </label>
        <div className="text-sm">Bintang
          <div className="mt-1"><Stars value={f.rating} onChange={(v) => setF({ ...f, rating: v })} /></div>
        </div>
        <label className="block text-sm">Ulasan
          <textarea className={`mt-1 min-h-[110px] resize-y ${input}`} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} placeholder="Tulis ulasan pembeli…" required />
        </label>
        <div className="text-sm">Foto <span className="text-muted-foreground">(opsional)</span>
          <div className="mt-1"><ImageInput value={f.image} onChange={(url) => setF({ ...f, image: url })} /></div>
        </div>
        <label className="block text-sm">Tanggal <span className="text-muted-foreground">(opsional)</span>
          <input type="date" className={`mt-1 ${input}`} value={f.createdAt} onChange={(e) => setF({ ...f, createdAt: e.target.value })} />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}{editId ? "Simpan" : "Tambah"}</Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex gap-3 rounded-lg border border-border p-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
              {r.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image} alt="" className="size-full object-cover" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{r.author}</span>
                <Stars value={r.rating} />
              </div>
              <p className="text-xs text-muted-foreground">{r.productName}</p>
              <p className="mt-1 line-clamp-3 text-sm">{r.comment}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button onClick={() => edit(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
              <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Belum ada ulasan.</p>}
      </div>
    </div>
  );
}
