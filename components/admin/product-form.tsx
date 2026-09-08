"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/lib/actions/admin";
import { ImageInput } from "@/components/admin/image-input";

/* ============================================================
   Varian 2 tingkat ala Shopee:
   - Grup WARNA (opsional) — tiap warna punya foto sendiri
   - Grup TIPE (wajib)      — tiap tipe punya berat sendiri
   - Matriks Warna × Tipe   — isi harga & stok per kombinasi
   Sistem menyusun baris Variant (color, type, name, sku, dst) otomatis.
   ============================================================ */

type ColorOpt = { key: string; name: string; image: string };
type TypeOpt = { key: string; name: string; weight: string };
type Cell = { id?: string; price: string; stock: string; sku: string };

type InitVariant = {
  id: string;
  name: string;
  color: string;
  type: string;
  sku: string;
  price: number;
  stock: number;
  weight: number;
  image: string;
};

type Initial = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImage: string;
  categoryId: string | null;
  isGrosir: boolean;
  variants: InitVariant[];
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

const rid = () => Math.random().toString(36).slice(2, 9);
const comboKey = (colorKey: string | null, typeKey: string) =>
  `${colorKey ?? "-"}__${typeKey}`;

// Nama tampilan otomatis (mis. "Hitam / iPhone 16 Pro" atau "iPhone 16 Pro").
function composeName(color: string, type: string) {
  return [color.trim(), type.trim()].filter(Boolean).join(" / ") || type.trim();
}

// SKU otomatis bila kosong: SLUG-WARNA-TIPE (huruf besar, aman).
function autoSku(slug: string, color: string, type: string) {
  return [slug, color, type]
    .filter(Boolean)
    .join("-")
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/* ---------- Rekonstruksi state dari produk yang diedit ---------- */
function buildInitialState(initial?: Initial) {
  const variants = initial?.variants ?? [];
  const hasColor = variants.some((v) => v.color.trim() !== "");

  const colors: ColorOpt[] = [];
  if (hasColor) {
    for (const v of variants) {
      const name = v.color.trim();
      if (name && !colors.some((c) => c.name === name)) {
        colors.push({ key: name, name, image: v.image });
      }
    }
  }

  const types: TypeOpt[] = [];
  for (const v of variants) {
    const name = (v.type.trim() || v.name).trim();
    if (name && !types.some((t) => t.name === name)) {
      types.push({ key: name, name, weight: String(v.weight) });
    }
  }
  if (types.length === 0) types.push({ key: rid(), name: "", weight: "200" });

  const cells: Record<string, Cell> = {};
  for (const v of variants) {
    const ck = v.color.trim() || null;
    const tk = (v.type.trim() || v.name).trim();
    cells[comboKey(hasColor ? ck : null, tk)] = {
      id: v.id,
      price: String(v.price),
      stock: String(v.stock),
      sku: v.sku,
    };
  }

  return { colors, types, cells };
}

export function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: Initial;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [isGrosir, setIsGrosir] = useState(initial?.isGrosir ?? false);

  const init = useMemo(() => buildInitialState(initial), [initial]);
  const [colors, setColors] = useState<ColorOpt[]>(init.colors);
  const [types, setTypes] = useState<TypeOpt[]>(init.types);
  const [cells, setCells] = useState<Record<string, Cell>>(init.cells);

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const colorList: (ColorOpt | null)[] = colors.length ? colors : [null];

  const setCell = (key: string, patch: Partial<Cell>) =>
    setCells((c) => {
      const prev = c[key] ?? { price: "", stock: "0", sku: "" };
      return { ...c, [key]: { ...prev, ...patch } };
    });

  const setColor = (i: number, patch: Partial<ColorOpt>) =>
    setColors((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const setType = (i: number, patch: Partial<TypeOpt>) =>
    setTypes((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Susun baris Variant dari matriks (lewati kombinasi tanpa harga = tidak dijual).
    const rows = [] as {
      id?: string;
      name: string;
      color: string;
      type: string;
      sku: string;
      price: number;
      stock: number;
      weight: number;
      image: string;
    }[];

    for (const c of colorList) {
      for (const t of types) {
        if (!t.name.trim()) continue;
        const cell = cells[comboKey(c ? c.key : null, t.key)];
        if (!cell || cell.price === "") continue; // tidak ditawarkan
        const color = c?.name.trim() ?? "";
        const type = t.name.trim();
        rows.push({
          id: cell.id,
          name: composeName(color, type),
          color,
          type,
          sku: cell.sku.trim() || autoSku(slug, color, type),
          price: Number(cell.price),
          stock: Number(cell.stock || 0),
          weight: Number(t.weight || 200),
          image: c?.image || coverImage,
        });
      }
    }

    if (rows.length === 0) {
      setError("Isi minimal 1 kombinasi (harga) pada tabel Harga & Stok.");
      return;
    }
    const skus = rows.map((r) => r.sku);
    if (new Set(skus).size !== skus.length) {
      setError("SKU kombinasi bertabrakan. Isi SKU manual agar unik.");
      return;
    }

    setSaving(true);
    const payload = { slug, name, description, coverImage, categoryId, isGrosir, variants: rows };
    const res = initial
      ? await updateProduct(initial.id, payload)
      : await createProduct(payload);
    if (res.ok) {
      router.push("/admin/produk");
      router.refresh();
    } else {
      setError(res.error ?? "Gagal menyimpan.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-8">
      {/* ---------- Info produk ---------- */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nama produk</span>
          <input className={`mt-1.5 ${input}`} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Slug</span>
          <input className={`mt-1.5 ${input}`} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clear-case-iphone" required />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Deskripsi</span>
          <textarea className={`mt-1.5 ${input}`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="block">
          <span className="text-sm font-medium">Foto cover</span>
          <div className="mt-1.5">
            <ImageInput value={coverImage} onChange={setCoverImage} />
          </div>
        </div>
        <label className="block">
          <span className="text-sm font-medium">Kategori</span>
          <select className={`mt-1.5 ${input}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— tanpa kategori —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border p-3 sm:col-span-2">
          <input
            type="checkbox"
            checked={isGrosir}
            onChange={(e) => setIsGrosir(e.target.checked)}
            className="mt-0.5 size-4"
          />
          <span>
            <span className="text-sm font-medium">Tampilkan di halaman Grosir</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Centang agar produk ini muncul di landing page /grosir.
            </span>
          </span>
        </label>
      </div>

      {/* ---------- Variasi 1: WARNA ---------- */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Variasi 1 — Warna</h2>
            <p className="text-xs text-muted-foreground">Opsional. Tiap warna punya fotonya sendiri.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setColors((cs) => [...cs, { key: rid(), name: "", image: "" }])}>
            <Plus className="size-4" /> Tambah warna
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {colors.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Belum ada warna — produk jadi 1 tingkat (tipe saja). Tambah warna untuk membuat 2 tingkat.
            </p>
          )}
          {colors.map((c, i) => (
            <div key={c.key} className="grid items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder="Nama warna (mis. Hitam)" value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} />
                <ImageInput value={c.image} onChange={(url) => setColor(i, { image: url })} placeholder="Foto warna" />
              </div>
              <button type="button" onClick={() => setColors((cs) => cs.filter((_, idx) => idx !== i))} className="justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end" aria-label="Hapus warna">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Variasi 2: TIPE ---------- */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Variasi 2 — Tipe</h2>
            <p className="text-xs text-muted-foreground">Wajib. Mis. iPhone 15, iPhone 16 Pro.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setTypes((ts) => [...ts, { key: rid(), name: "", weight: "200" }])}>
            <Plus className="size-4" /> Tambah tipe
          </Button>
        </div>
        <div className="mt-3 space-y-3">
          {types.map((t, i) => (
            <div key={t.key} className="grid items-center gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2 sm:grid-cols-2">
                <input className={input} placeholder="Nama tipe (mis. iPhone 16 Pro)" value={t.name} onChange={(e) => setType(i, { name: e.target.value })} required />
                <input className={input} type="number" placeholder="Berat (gram)" value={t.weight} onChange={(e) => setType(i, { weight: e.target.value })} />
              </div>
              {types.length > 1 && (
                <button type="button" onClick={() => setTypes((ts) => ts.filter((_, idx) => idx !== i))} className="justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end" aria-label="Hapus tipe">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Matriks harga & stok ---------- */}
      <div>
        <h2 className="text-sm font-medium">Harga & Stok per kombinasi</h2>
        <p className="text-xs text-muted-foreground">Kosongkan harga bila kombinasi tidak dijual. SKU auto bila dikosongkan.</p>
        <div className="mt-3 space-y-4">
          {colorList.map((c) => (
            <div key={c ? c.key : "nocolor"} className="rounded-lg border border-border">
              {c && (
                <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                  <span className="relative size-6 overflow-hidden rounded bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.image ? <img src={c.image} alt={c.name} className="size-full object-cover" /> : null}
                  </span>
                  <span className="text-sm font-medium">{c.name || "Warna tanpa nama"}</span>
                </div>
              )}
              <div className="divide-y divide-border">
                {types.filter((t) => t.name.trim()).map((t) => {
                  const key = comboKey(c ? c.key : null, t.key);
                  const cell = cells[key] ?? { price: "", stock: "0", sku: "" };
                  return (
                    <div key={t.key} className="grid items-center gap-2 p-3 sm:grid-cols-[1.2fr_1fr_0.8fr_1.2fr]">
                      <span className="text-sm">{t.name}</span>
                      <input className={input} type="number" placeholder="Harga (Rp)" value={cell.price} onChange={(e) => setCell(key, { price: e.target.value })} />
                      <input className={input} type="number" placeholder="Stok" value={cell.stock} onChange={(e) => setCell(key, { stock: e.target.value })} />
                      <input className={input} placeholder="SKU (auto)" value={cell.sku} onChange={(e) => setCell(key, { sku: e.target.value })} />
                    </div>
                  );
                })}
                {types.filter((t) => t.name.trim()).length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Tambah tipe dulu di atas.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}
          {initial ? "Simpan perubahan" : "Buat produk"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/produk")}>
          Batal
        </Button>
      </div>
    </form>
  );
}
