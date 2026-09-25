"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveBanner, deleteBanner } from "@/lib/actions/admin";
import { ImageInput } from "@/components/admin/image-input";

type Banner = {
  id: string;
  type: string;
  image: string;
  targetUrl: string | null;
  order: number;
  active: boolean;
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

const BLANK = { type: "MAIN", image: "", targetUrl: "", order: "0", active: true };

// Rasio pratinjau per tipe (samakan dgn tampilan storefront).
const ASPECT: Record<string, string> = {
  MAIN: "aspect-[2/1]",
  PROMO: "aspect-square",
  ETALASE: "aspect-[5/1]",
  POPUP: "aspect-square",
};

export function BannerManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ ...BLANK });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setEditId(null);
    setF({ ...BLANK });
    setError(null);
  }

  function edit(b: Banner) {
    setEditId(b.id);
    setF({ type: b.type, image: b.image, targetUrl: b.targetUrl ?? "", order: String(b.order), active: b.active });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await saveBanner(
      { type: f.type as "MAIN" | "ETALASE" | "PROMO" | "POPUP", image: f.image, targetUrl: f.targetUrl, order: Number(f.order), active: f.active },
      editId ?? undefined,
    );
    if (res.ok) {
      reset();
      router.refresh();
    } else setError(res.error ?? "Gagal.");
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("Hapus banner ini?")) return;
    const res = await deleteBanner(id);
    if (res.ok) router.refresh();
    else alert(res.error);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form onSubmit={save} className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{editId ? "Edit banner" : "Banner baru"}</h2>
        <label className="block text-sm">Tipe
          <select className={`mt-1 ${input}`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="MAIN">MAIN — Hero besar (1200×600)</option>
            <option value="PROMO">PROMO — 2 banner kotak (1000×1000)</option>
            <option value="ETALASE">ETALASE — Strip panjang (2000×400)</option>
            <option value="POPUP">POPUP — Popup awal masuk (1000×1000)</option>
          </select>
        </label>
        <div className="block text-sm">Gambar
          <p className="mt-0.5 text-xs text-muted-foreground">
            {f.type === "MAIN" && <>Hero — ideal <b>1200×600 px</b> (landscape 2:1).</>}
            {f.type === "PROMO" && <>Banner kotak (2 berdampingan) — ideal <b>1000×1000 px</b> (1:1).</>}
            {f.type === "ETALASE" && <>Banner strip panjang — ideal <b>2000×400 px</b> (landscape lebar, rasio 5:1).</>}
            {f.type === "POPUP" && <>Popup saat pengunjung masuk (sekali per 6 jam) — ideal <b>1000×1000 px</b> (1:1).</>}
          </p>
          <div className="mt-1">
            <ImageInput value={f.image} onChange={(url) => setF({ ...f, image: url })} />
          </div>
          {/* Live preview */}
          {f.image && (
            <div className="mt-2">
              <p className="mb-1 text-xs text-muted-foreground">Pratinjau ({f.type})</p>
              <div className={`w-full overflow-hidden rounded-lg border border-border bg-muted ${ASPECT[f.type] ?? "aspect-square"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.image} alt="" className="size-full object-contain" />
              </div>
            </div>
          )}
        </div>
        <label className="block text-sm">Target link (opsional)
          <input className={`mt-1 ${input}`} value={f.targetUrl} onChange={(e) => setF({ ...f, targetUrl: e.target.value })} placeholder="/produk?tipe=iphone" />
        </label>
        <label className="block text-sm">Urutan
          <input type="number" className={`mt-1 ${input}`} value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-foreground" />
          Aktif
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editId ? "Simpan" : "Tambah"}
          </Button>
          {editId && <Button type="button" size="sm" variant="ghost" onClick={reset}>Batal</Button>}
        </div>
      </form>

      <div className="space-y-2">
        {banners.map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.image} alt="" className="size-12 shrink-0 rounded border border-border bg-muted object-contain" />
            <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium">{b.type}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{b.image}</span>
            {!b.active && <span className="text-xs text-muted-foreground">nonaktif</span>}
            <button onClick={() => edit(b)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
            <button onClick={() => del(b.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
        {banners.length === 0 && <p className="text-sm text-muted-foreground">Belum ada banner.</p>}
      </div>
    </div>
  );
}
