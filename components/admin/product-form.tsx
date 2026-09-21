"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createProduct, updateProduct } from "@/lib/actions/admin";
import { ImageInput } from "@/components/admin/image-input";
import { ImageGridInput } from "@/components/admin/image-grid-input";

/* ============================================================
   Editor varian custom (ala Shopee/Tokopedia):
   - Variasi 1 (wajib) + Variasi 2 (opsional), nama bebas
   - Tiap variasi punya banyak Opsi (value + penjelasan)
   - Opsi variasi pertama punya foto sendiri
   - Matriks kombinasi: Harga, Stok, Kode Variasi (SKU)
   Disimpan ke tabel Variant (color=var1, type=var2) + Product.variantGroups
   (nama variasi custom) agar label di PDP mengikuti.
   ============================================================ */

type Opt = { key: string; value: string; desc: string; image: string };
type Group = { key: string; name: string; options: Opt[] };
type Cell = { id?: string; price: string; stock: string; sku: string };

type InitVariant = {
  id: string; name: string; color: string; type: string;
  sku: string; price: number; stock: number; weight: number; image: string;
};
type VariantGroups = { groups: { name: string; options: { value: string; desc: string }[] }[] } | null;

type Initial = {
  id: string; slug: string; name: string; description: string | null;
  coverImage: string; images: string[]; categoryId: string | null;
  isGrosir: boolean; variants: InitVariant[]; variantGroups: VariantGroups; weight: number;
};

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand";
const rid = () => Math.random().toString(36).slice(2, 9);
const combo = (a: string, b: string | null) => `${a}__${b ?? "-"}`;

function composeName(v1: string, v2: string) {
  return [v1.trim(), v2.trim()].filter(Boolean).join(" / ") || v1.trim();
}
function autoSku(slug: string, a: string, b: string) {
  return [slug, a, b].filter(Boolean).join("-").toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

/* ---------- Rekonstruksi state dari produk yang diedit ---------- */
function buildInitialState(initial?: Initial): { groups: Group[]; cells: Record<string, Cell> } {
  const variants = initial?.variants ?? [];
  if (!variants.length) {
    return { groups: [{ key: rid(), name: "", options: [{ key: rid(), value: "", desc: "", image: "" }] }], cells: {} };
  }
  const hasColor = variants.some((v) => v.color.trim() !== "");
  const vg = initial?.variantGroups?.groups;

  // Nama variasi: dari variantGroups bila ada, else default Warna/Tipe.
  const name1 = vg?.[0]?.name ?? (hasColor ? "Warna" : "Tipe");
  const name2 = vg?.[1]?.name ?? "Tipe";
  const descOf = (gi: number, value: string) =>
    vg?.[gi]?.options.find((o) => o.value === value)?.desc ?? "";

  // Var1 = color bila 2 dimensi, else = type (single).
  const opts1: Opt[] = [];
  const opts2: Opt[] = [];
  for (const v of variants) {
    const v1 = hasColor ? v.color.trim() : (v.type.trim() || v.name);
    const v2 = hasColor ? (v.type.trim() || v.name) : "";
    if (v1 && !opts1.some((o) => o.value === v1))
      opts1.push({ key: v1, value: v1, desc: descOf(0, v1), image: hasColor ? v.image : v.image });
    if (hasColor && v2 && !opts2.some((o) => o.value === v2))
      opts2.push({ key: v2, value: v2, desc: descOf(1, v2), image: "" });
  }

  const groups: Group[] = [{ key: rid(), name: name1, options: opts1 }];
  if (hasColor) groups.push({ key: rid(), name: name2, options: opts2 });

  const cells: Record<string, Cell> = {};
  for (const v of variants) {
    const v1 = hasColor ? v.color.trim() : (v.type.trim() || v.name);
    const v2 = hasColor ? (v.type.trim() || v.name) : null;
    cells[combo(v1, v2)] = { id: v.id, price: String(v.price), stock: String(v.stock), sku: v.sku };
  }
  return { groups, cells };
}

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

export function ProductForm({ categories, initial }: { categories: { id: string; name: string }[]; initial?: Initial }) {
  const router = useRouter();
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [isGrosir, setIsGrosir] = useState(initial?.isGrosir ?? false);
  const [weight, setWeight] = useState(String(initial?.weight ?? 200));

  const photos = [coverImage, ...images].filter(Boolean);
  const setPhotos = (v: string[]) => { setCoverImage(v[0] ?? ""); setImages(v.slice(1)); };

  const init = useMemo(() => buildInitialState(initial), [initial]);
  const [groups, setGroups] = useState<Group[]>(init.groups);
  const [cells, setCells] = useState<Record<string, Cell>>(init.cells);
  const [bulk, setBulk] = useState({ price: "", stock: "", sku: "" });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const g1 = groups[0];
  const g2 = groups[1];
  const opts1 = g1?.options.filter((o) => o.value.trim()) ?? [];
  const opts2 = g2?.options.filter((o) => o.value.trim()) ?? [];

  /* ---- mutasi grup/opsi ---- */
  const setGroup = (gi: number, patch: Partial<Group>) =>
    setGroups((gs) => gs.map((g, i) => (i === gi ? { ...g, ...patch } : g)));
  const setOpt = (gi: number, oi: number, patch: Partial<Opt>) =>
    setGroups((gs) => gs.map((g, i) => i === gi ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) } : g));
  const addOpt = (gi: number) =>
    setGroups((gs) => gs.map((g, i) => i === gi ? { ...g, options: [...g.options, { key: rid(), value: "", desc: "", image: "" }] } : g));
  const removeOpt = (gi: number, oi: number) =>
    setGroups((gs) => gs.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g));
  const addGroup2 = () =>
    setGroups((gs) => gs.length >= 2 ? gs : [...gs, { key: rid(), name: "", options: [{ key: rid(), value: "", desc: "", image: "" }] }]);
  const removeGroup = (gi: number) => setGroups((gs) => gs.filter((_, i) => i !== gi));

  const setCell = (key: string, patch: Partial<Cell>) =>
    setCells((c) => ({ ...c, [key]: { ...(c[key] ?? { price: "", stock: "0", sku: "" }), ...patch } }));

  function applyAll() {
    setCells((prev) => {
      const next = { ...prev };
      for (const o1 of opts1) {
        const list = opts2.length ? opts2 : [null as Opt | null];
        for (const o2 of list) {
          const key = combo(o1.value, o2 ? o2.value : null);
          const cur = next[key] ?? { price: "", stock: "0", sku: "" };
          next[key] = {
            ...cur,
            price: bulk.price !== "" ? bulk.price : cur.price,
            stock: bulk.stock !== "" ? bulk.stock : cur.stock,
            sku: bulk.sku !== "" ? bulk.sku : cur.sku,
          };
        }
      }
      return next;
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!coverImage) { setError("Unggah minimal 1 foto produk."); return; }
    if (!opts1.length) { setError("Isi minimal 1 opsi pada Variasi 1."); return; }

    const has2 = opts2.length > 0;
    const rows: {
      id?: string; name: string; color: string; type: string;
      sku: string; price: number; stock: number; weight: number; image: string;
    }[] = [];
    for (const o1 of opts1) {
      const list = has2 ? opts2 : [null as Opt | null];
      for (const o2 of list) {
        const key = combo(o1.value, o2 ? o2.value : null);
        const cell = cells[key];
        if (!cell || cell.price === "") continue; // tidak dijual
        const color = has2 ? o1.value.trim() : "";
        const type = has2 ? (o2 as Opt).value.trim() : o1.value.trim();
        rows.push({
          id: cell.id,
          name: composeName(has2 ? color : type, has2 ? type : ""),
          color, type,
          sku: cell.sku.trim() || autoSku(slug, has2 ? color : "", type),
          price: Number(cell.price),
          stock: Number(cell.stock || 0),
          weight: Number(weight || 200),
          image: o1.image || coverImage,
        });
      }
    }
    if (!rows.length) { setError("Isi minimal 1 harga pada tabel Daftar Variasi."); return; }
    const skus = rows.map((r) => r.sku);
    if (new Set(skus).size !== skus.length) { setError("Kode Variasi (SKU) bertabrakan. Isi manual agar unik."); return; }

    const variantGroups = {
      groups: groups.slice(0, has2 ? 2 : 1).map((g) => ({
        name: g.name.trim(),
        options: g.options.filter((o) => o.value.trim()).map((o) => ({ value: o.value.trim(), desc: o.desc.trim() })),
      })),
    };

    setSaving(true);
    const payload = { slug, name, description, coverImage, images, variantGroups, categoryId, isGrosir, variants: rows };
    const res = initial ? await updateProduct(initial.id, payload) : await createProduct(payload);
    if (res.ok) { router.push("/admin/produk"); router.refresh(); }
    else { setError(res.error ?? "Gagal menyimpan."); setSaving(false); }
  }

  const navItems = [
    { href: "#informasi", label: "Informasi dasar" },
    { href: "#detail", label: "Detail produk" },
    { href: "#penjualan", label: "Informasi penjualan" },
  ];
  const previewV1 = opts1[0]?.value;
  const previewV2 = opts2[0]?.value;

  return (
    <form onSubmit={submit} className="pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/admin/produk")} className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{initial ? "Ubah produk" : "Tambah produk"}</h1>
            <p className="text-sm text-muted-foreground">Toko SNAPFIT</p>
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
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <nav className="rounded-xl border border-border bg-card p-2 shadow-sm">
              {navItems.map((n) => (
                <a key={n.href} href={n.href} className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{n.label}</a>
              ))}
            </nav>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs font-medium text-muted-foreground">Pratinjau</p>
              <div className="mt-3 aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted">
                {coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImage} alt="" className="size-full object-contain" />
                ) : <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Foto</div>}
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-medium">{name || "Nama produk"}</p>
              {previewV1 && <p className="mt-1 text-xs text-muted-foreground">{g1?.name || "Variasi 1"}: <span className="text-foreground">{previewV1}</span></p>}
              {previewV2 && <p className="text-xs text-muted-foreground">{g2?.name || "Variasi 2"}: <span className="text-foreground">{previewV2}</span></p>}
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          {/* ---- Informasi dasar ---- */}
          <Card id="informasi" title="Informasi dasar">
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium">Gambar <Req /></p>
                <p className="mb-2 text-xs text-muted-foreground">Unggah hingga 9 foto. Foto pertama jadi foto utama.</p>
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
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <div className="space-y-5">
              <label className="block">
                <span className="text-sm font-medium">Deskripsi</span>
                <textarea className={`mt-1.5 ${input}`} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Jelaskan bahan, fitur, kompatibilitas, dan keunggulan produk." />
              </label>
              <label className="block max-w-xs">
                <span className="text-sm font-medium">Berat paket (gram) <Req /></span>
                <input className={`mt-1.5 ${input}`} type="number" min={1} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="200" />
                <span className="mt-1 block text-xs text-muted-foreground">Dipakai menghitung ongkir. Berlaku untuk semua varian.</span>
              </label>
            </div>
          </Card>

          {/* ---- Informasi penjualan (varian custom) ---- */}
          <Card id="penjualan" title="Informasi penjualan" desc="Buat variasi bebas (mis. Warna, Model, Ukuran). Variasi 2 opsional.">
            {/* Variasi 1 & 2 */}
            {groups.map((g, gi) => (
              <div key={g.key} className="mb-4 rounded-lg bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Variasi {gi + 1}{gi === 0 && <Req />}</span>
                  {gi > 0 && (
                    <button type="button" onClick={() => removeGroup(gi)} className="text-muted-foreground hover:text-destructive" aria-label="Hapus variasi">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <input
                  className={`mt-2 ${input} bg-background`}
                  placeholder={gi === 0 ? "Nama variasi (mis. Warna)" : "Nama variasi (mis. Ukuran)"}
                  value={g.name}
                  onChange={(e) => setGroup(gi, { name: e.target.value })}
                />
                <p className="mt-3 text-sm font-medium">Opsi <Req /></p>
                <div className="mt-2 space-y-2">
                  {g.options.map((o, oi) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <input className={`${input} bg-background`} placeholder="Masukkan opsi" value={o.value} onChange={(e) => setOpt(gi, oi, { value: e.target.value })} />
                      <input className={`${input} bg-background`} placeholder="Tulis penjelasan (opsional)" value={o.desc} onChange={(e) => setOpt(gi, oi, { desc: e.target.value })} />
                      {gi === 0 && (
                        <div className="w-40 shrink-0">
                          <ImageInput value={o.image} onChange={(url) => setOpt(gi, oi, { image: url })} placeholder="Foto opsi" />
                        </div>
                      )}
                      <button type="button" onClick={() => removeOpt(gi, oi)} disabled={g.options.length <= 1} className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30" aria-label="Hapus opsi">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addOpt(gi)} className="mt-2 flex items-center gap-1 text-sm text-brand hover:underline">
                  <Plus className="size-4" /> Tambah opsi
                </button>
              </div>
            ))}

            {groups.length < 2 && (
              <button type="button" onClick={addGroup2} className="mb-4 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2.5 text-sm font-medium text-brand hover:bg-brand/5">
                <Plus className="size-4" /> Tambah Variasi 2
              </button>
            )}

            {/* Terapkan ke semua */}
            {opts1.length > 0 && (
              <>
                <p className="text-sm font-semibold">Daftar Variasi</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input className={`${input} w-32`} type="number" placeholder="Rp Harga" value={bulk.price} onChange={(e) => setBulk((b) => ({ ...b, price: e.target.value }))} />
                  <input className={`${input} w-24`} type="number" placeholder="Stok" value={bulk.stock} onChange={(e) => setBulk((b) => ({ ...b, stock: e.target.value }))} />
                  <input className={`${input} w-40`} placeholder="Kode Variasi" value={bulk.sku} onChange={(e) => setBulk((b) => ({ ...b, sku: e.target.value }))} />
                  <button type="button" onClick={applyAll} className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90">Terapkan Ke Semua</button>
                </div>

                {/* Matriks */}
                <div className="mt-4 space-y-4">
                  {opts1.map((o1) => (
                    <div key={o1.key} className="overflow-hidden rounded-lg border border-border">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
                        <span className="relative size-7 overflow-hidden rounded bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {o1.image ? <img src={o1.image} alt="" className="size-full object-cover" /> : null}
                        </span>
                        <span className="text-sm font-medium">{o1.value}</span>
                        <span className="text-xs text-muted-foreground">{g1?.name}</span>
                      </div>
                      <div>
                        <div className="hidden grid-cols-[1.2fr_1fr_0.8fr_1.2fr] gap-2 bg-muted/20 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
                          <span>{g2?.name || "Varian"}</span><span>Harga (Rp) <Req /></span><span>Stok <Req /></span><span>Kode Variasi</span>
                        </div>
                        {(opts2.length ? opts2 : [null]).map((o2) => {
                          const key = combo(o1.value, o2 ? o2.value : null);
                          const cell = cells[key] ?? { price: "", stock: "0", sku: "" };
                          return (
                            <div key={o2 ? o2.key : "single"} className="grid items-center gap-2 border-t border-border p-3 first:border-0 sm:grid-cols-[1.2fr_1fr_0.8fr_1.2fr]">
                              <span className="text-sm">{o2 ? o2.value : o1.value}</span>
                              <input className={input} type="number" placeholder="Harga" value={cell.price} onChange={(e) => setCell(key, { price: e.target.value })} />
                              <input className={input} type="number" placeholder="Stok" value={cell.stock} onChange={(e) => setCell(key, { stock: e.target.value })} />
                              <input className={input} placeholder="Kode (auto)" value={cell.sku} onChange={(e) => setCell(key, { sku: e.target.value })} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

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
