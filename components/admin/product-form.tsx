"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/lib/actions/admin";
import { ImageInput } from "@/components/admin/image-input";
import { ImageGridInput } from "@/components/admin/image-grid-input";

/* ============================================================
   Varian 2 tingkat ala Shopee:
   - Grup WARNA (opsional) — tiap warna punya foto sendiri
   - Grup TIPE (wajib)      — tiap tipe punya berat sendiri
   - Matriks Warna × Tipe   — isi harga & stok per kombinasi
   Tata letak: bersection ala Tokopedia Seller Center.
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
  images: string[];
  categoryId: string | null;
  isGrosir: boolean;
  variants: InitVariant[];
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";

const rid = () => Math.random().toString(36).slice(2, 9);
const comboKey = (colorKey: string | null, typeKey: string) =>
  `${colorKey ?? "-"}__${typeKey}`;

function composeName(color: string, type: string) {
  return [color.trim(), type.trim()].filter(Boolean).join(" / ") || type.trim();
}

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

/* ---------- Kartu section ---------- */
function Card({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
const Req = () => <span className="text-destructive">*</span>;

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
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");

  // Foto: gabungan [cover, ...galeri]; foto pertama = utama (cover).
  const photos = [coverImage, ...images].filter(Boolean);
  const setPhotos = (v: string[]) => {
    setCoverImage(v[0] ?? "");
    setImages(v.slice(1));
  };
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
        if (!cell || cell.price === "") continue;
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

    if (!coverImage) {
      setError("Unggah minimal 1 foto produk.");
      return;
    }

    setSaving(true);
    const payload = { slug, name, description, coverImage, images, categoryId, isGrosir, variants: rows };
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

  const navItems = [
    { href: "#informasi", label: "Informasi dasar" },
    { href: "#detail", label: "Detail produk" },
    { href: "#penjualan", label: "Info penjualan" },
  ];
  const previewColor = colors[0]?.name;
  const previewType = types.find((t) => t.name.trim())?.name;

  return (
    <form onSubmit={submit} className="pb-24">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/admin/produk")} className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{initial ? "Ubah produk" : "Tambah produk"}</h1>
            <p className="text-sm text-muted-foreground">Toko SnapFit</p>
          </div>
        </div>
        <div className="hidden gap-2 sm:flex">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/produk")}>Batal</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan perubahan" : "Kirim"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sidebar kiri: nav + pratinjau */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <nav className="rounded-xl border border-border bg-card p-2 shadow-sm">
              {navItems.map((n) => (
                <a key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                  {n.label}
                </a>
              ))}
            </nav>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Pratinjau</p>
              <div className="mt-3 aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage} alt="" className="size-full object-contain" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Foto</div>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium">{name || "Nama produk"}</p>
              {previewColor && <p className="mt-1 text-xs text-muted-foreground">Warna: <span className="text-foreground">{previewColor}</span></p>}
              {previewType && <p className="text-xs text-muted-foreground">Tipe: <span className="text-foreground">{previewType}</span></p>}
            </div>
          </div>
        </aside>

        {/* Konten */}
        <div className="space-y-6">
          {/* ---- Informasi dasar ---- */}
          <Card id="informasi" title="Informasi dasar">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium">Gambar <Req /></p>
                <p className="mb-2 text-xs text-muted-foreground">Unggah hingga 9 foto. Foto pertama jadi foto utama. Foto tiap warna diatur di bagian Info penjualan.</p>
                <ImageGridInput value={photos} onChange={setPhotos} />
              </div>

              <label className="block">
                <span className="text-sm font-medium">Nama produk <Req /></span>
                <div className="relative mt-1.5">
                  <input className={`${input} pr-14`} maxLength={255} value={name} onChange={(e) => setName(e.target.value)} required placeholder="mis. Case iPhone 15" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{name.length}/255</span>
                </div>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Slug (URL) <Req /></span>
                <input className={`mt-1.5 ${input}`} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="clear-case-iphone-15" required />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Kategori</span>
                <select className={`mt-1.5 ${input}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">— tanpa kategori —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3">
                <input type="checkbox" checked={isGrosir} onChange={(e) => setIsGrosir(e.target.checked)} className="mt-0.5 size-4 accent-brand" />
                <span>
                  <span className="text-sm font-medium">Tampilkan di halaman Grosir</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Centang agar produk ini muncul di landing page /grosir.</span>
                </span>
              </label>
            </div>
          </Card>

          {/* ---- Detail produk ---- */}
          <Card id="detail" title="Detail produk">
            <label className="block">
              <span className="text-sm font-medium">Deskripsi</span>
              <textarea className={`mt-1.5 ${input}`} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan bahan, fitur, kompatibilitas, dan keunggulan produk." />
            </label>
          </Card>

          {/* ---- Info penjualan (varian) ---- */}
          <Card id="penjualan" title="Info penjualan" desc="Atur varian, harga, dan stok. Bisa 1 tingkat (Tipe saja) atau 2 tingkat (Warna × Tipe).">
            {/* Variasi 1: Warna */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Variasi 1 — Warna</h3>
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

            {/* Variasi 2: Tipe */}
            <div className="mt-4 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Variasi 2 — Tipe <Req /></h3>
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
                      <input className={input} placeholder="Nama tipe (mis. iPhone 16 Pro)" value={t.name} onChange={(e) => setType(i, { name: e.target.value })} />
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

            {/* Daftar varian: harga & stok */}
            <div className="mt-4">
              <h3 className="text-sm font-medium">Daftar varian — Harga & Stok</h3>
              <p className="text-xs text-muted-foreground">Kosongkan harga bila kombinasi tidak dijual. SKU otomatis bila dikosongkan.</p>
              <div className="mt-3 space-y-4">
                {colorList.map((c) => (
                  <div key={c ? c.key : "nocolor"} className="overflow-hidden rounded-lg border border-border">
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
                      <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_1.2fr] gap-2 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
                        <span>Tipe</span><span>Harga (Rp)</span><span>Stok</span><span>SKU</span>
                      </div>
                      {types.filter((t) => t.name.trim()).map((t) => {
                        const key = comboKey(c ? c.key : null, t.key);
                        const cell = cells[key] ?? { price: "", stock: "0", sku: "" };
                        return (
                          <div key={t.key} className="grid items-center gap-2 p-3 sm:grid-cols-[1.2fr_1fr_0.8fr_1.2fr]">
                            <span className="text-sm">{t.name}</span>
                            <input className={input} type="number" placeholder="Harga" value={cell.price} onChange={(e) => setCell(key, { price: e.target.value })} />
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
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {/* Action bar bawah (sticky) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur lg:pl-60">
        <div className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 sm:px-6">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/produk")}>Batal</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan perubahan" : "Kirim"}
          </Button>
        </div>
      </div>
    </form>
  );
}
