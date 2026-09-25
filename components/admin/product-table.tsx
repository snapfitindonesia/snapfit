"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Search, Trash2, Loader2 } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { deleteProduct, deleteProducts } from "@/lib/actions/admin";

export type AdminVariant = {
  id: string;
  name: string;
  color: string | null;
  type: string | null;
  price: number;
  stock: number;
  image: string | null;
  sku: string | null;
};
export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  coverImage: string | null;
  category: string | null;
  isGrosir: boolean;
  sold: number;
  variants: AdminVariant[];
};

const PER_PAGE = 10;
const VISIBLE_VARIANTS = 3;

function variantLabel(v: AdminVariant) {
  return [v.color, v.type].filter(Boolean).join(" · ") || v.name;
}
function totalStock(p: AdminProduct) {
  return p.variants.reduce((n, v) => n + v.stock, 0);
}
function minPrice(p: AdminProduct) {
  return p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : 0;
}
function priceRange(p: AdminProduct) {
  if (!p.variants.length) return formatRupiah(0);
  const prices = p.variants.map((v) => v.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? formatRupiah(min) : `${formatRupiah(min)} - ${formatRupiah(max)}`;
}

type Tab = "semua" | "aktif" | "habis" | "grosir";
type SortKey = "terbaru" | "nama" | "harga-asc" | "harga-desc" | "stok-desc" | "terjual";
const SORT_LABEL: Record<SortKey, string> = {
  terbaru: "Terbaru",
  nama: "Nama A–Z",
  "harga-asc": "Harga termurah",
  "harga-desc": "Harga termahal",
  "stok-desc": "Stok terbanyak",
  terjual: "Terlaris",
};

export function ProductTable({ products }: { products: AdminProduct[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("semua");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  const [sort, setSort] = useState<SortKey>("terbaru");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const categories = useMemo(
    () => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [products],
  );

  const counts = useMemo(() => ({
    semua: products.length,
    aktif: products.filter((p) => totalStock(p) > 0).length,
    habis: products.filter((p) => totalStock(p) === 0).length,
    grosir: products.filter((p) => p.isGrosir).length,
  }), [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (tab === "aktif") list = list.filter((p) => totalStock(p) > 0);
    else if (tab === "habis") list = list.filter((p) => totalStock(p) === 0);
    else if (tab === "grosir") list = list.filter((p) => p.isGrosir);
    if (cat) list = list.filter((p) => p.category === cat);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.variants.some((v) => variantLabel(v).toLowerCase().includes(q) || (v.sku ?? "").toLowerCase().includes(q)),
      );
    }
    return list;
  }, [products, tab, cat, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "nama": arr.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "harga-asc": arr.sort((a, b) => minPrice(a) - minPrice(b)); break;
      case "harga-desc": arr.sort((a, b) => minPrice(b) - minPrice(a)); break;
      case "stok-desc": arr.sort((a, b) => totalStock(b) - totalStock(a)); break;
      case "terjual": arr.sort((a, b) => b.sold - a.sold); break;
      // "terbaru": urutan bawaan (createdAt desc dari server)
    }
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageClamped = Math.min(page, totalPages);
  const pageItems = sorted.slice((pageClamped - 1) * PER_PAGE, pageClamped * PER_PAGE);

  function applySearch() { setQuery(rawQuery); setPage(1); }
  function reset() { setRawQuery(""); setQuery(""); setTab("semua"); setCat(""); setSort("terbaru"); setPage(1); setSelected(new Set()); }

  async function onDelete(p: AdminProduct) {
    if (!confirm(`Hapus produk "${p.name}"? Tindakan ini tak bisa dibatalkan.`)) return;
    setBusyId(p.id);
    const res = await deleteProduct(p.id);
    if (res.ok) { setSelected((s) => { const n = new Set(s); n.delete(p.id); return n; }); router.refresh(); }
    else { alert(res.error ?? "Gagal menghapus."); setBusyId(null); }
  }

  // ---- Pilih massal ----
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((s) => {
      if (filtered.every((p) => s.has(p.id))) {
        const n = new Set(s); filtered.forEach((p) => n.delete(p.id)); return n;
      }
      const n = new Set(s); filtered.forEach((p) => n.add(p.id)); return n;
    });
  }
  async function onBulkDelete() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Hapus ${ids.length} produk terpilih? Tindakan ini tak bisa dibatalkan.`)) return;
    setBulkBusy(true);
    const res = await deleteProducts(ids);
    if (res.ok) { setSelected(new Set()); router.refresh(); }
    else alert(res.error ?? "Gagal menghapus.");
    setBulkBusy(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "semua", label: "Semua" },
    { key: "aktif", label: "Aktif" },
    { key: "habis", label: "Stok Habis" },
    { key: "grosir", label: "Grosir" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Tabs status */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm transition-colors ${
              tab === t.key ? "border-brand font-medium text-brand" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label} <span className="text-xs">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Cari nama produk, kode variasi, ID produk"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <button onClick={applySearch} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90">
          Cari
        </button>
        <select
          value={cat}
          onChange={(e) => { setCat(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => { setSort(e.target.value as SortKey); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
        >
          {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
        </select>
        <button onClick={reset} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
          Atur ulang
        </button>
      </div>

      {/* Bar aksi massal */}
      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-y border-border bg-brand/5 px-3 py-2 text-sm">
          <span className="font-medium">{selected.size} produk dipilih</span>
          <button
            onClick={onBulkDelete}
            disabled={bulkBusy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {bulkBusy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Hapus terpilih
          </button>
          <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">Batal</button>
        </div>
      ) : (
        <div className="px-3 pb-2 text-sm text-muted-foreground">{filtered.length} Produk</div>
      )}

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Pilih semua" className="size-4 accent-brand align-middle" />
              </th>
              <th className="px-4 py-2.5 font-medium">Produk</th>
              <th className="px-4 py-2.5 font-medium">Harga</th>
              <th className="px-4 py-2.5 font-medium">Stok</th>
              <th className="px-4 py-2.5 font-medium">Penjualan</th>
              <th className="px-4 py-2.5 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          {pageItems.map((p) => {
              const isOpen = expanded[p.id];
              const shown = isOpen ? p.variants : p.variants.slice(0, VISIBLE_VARIANTS);
              const hasMore = p.variants.length > VISIBLE_VARIANTS;
              return (
                <tbody key={p.id} className="border-b-4 border-muted/50">
                  {/* Baris produk induk */}
                  <tr className={selected.has(p.id) ? "bg-brand/5" : "bg-card"}>
                    <td className="px-3 py-3 align-top">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Pilih ${p.name}`} className="mt-1 size-4 accent-brand" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <img
                          src={p.coverImage ?? undefined}
                          alt=""
                          className="size-12 shrink-0 rounded-md border border-border object-contain"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium leading-snug">{p.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">ID Produk: {p.id.slice(0, 10)}</p>
                          <p className="text-xs text-muted-foreground">Kode: {p.slug}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.category && (
                              <span className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.category}</span>
                            )}
                            {p.isGrosir && (
                              <span className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium text-brand">Grosir</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">{priceRange(p)}</td>
                    <td className="px-4 py-3 align-top">{totalStock(p)}</td>
                    <td className="px-4 py-3 align-top text-muted-foreground">Penjualan {p.sold}</td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col items-end gap-1">
                        <Link href={`/admin/produk/${p.id}`} className="text-brand hover:underline">Ubah</Link>
                        <button
                          onClick={() => onDelete(p)}
                          disabled={busyId === p.id}
                          className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Baris varian */}
                  {shown.map((v) => (
                    <tr key={v.id} className="bg-muted/20 text-xs">
                      <td className="px-3 py-2" />
                      <td className="py-2 pl-8 pr-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={(v.image || p.coverImage) ?? undefined}
                            alt=""
                            className="size-9 shrink-0 rounded border border-border object-contain"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{variantLabel(v)}</p>
                            {v.sku && <p className="text-muted-foreground">Kode: {v.sku}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2">{formatRupiah(v.price)}</td>
                      <td className="px-4 py-2">
                        {v.stock === 0 ? <span className="font-medium text-destructive">Habis</span> : v.stock}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">-</td>
                      <td className="px-4 py-2" />
                    </tr>
                  ))}

                  {hasMore && (
                    <tr className="bg-muted/20">
                      <td colSpan={6} className="px-8 py-2">
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [p.id]: !e[p.id] }))}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isOpen ? (
                            <>Sembunyikan <ChevronUp className="size-3.5" /></>
                          ) : (
                            <>Lihat Semua ({p.variants.length} SKU Produk) <ChevronDown className="size-3.5" /></>
                          )}
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          {pageItems.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">Tidak ada produk.</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-end gap-3 p-3 text-sm">
          <span className="text-muted-foreground">Halaman {pageClamped} / {totalPages}</span>
          <button
            onClick={() => setPage((n) => Math.max(1, n - 1))}
            disabled={pageClamped <= 1}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => setPage((n) => Math.min(totalPages, n + 1))}
            disabled={pageClamped >= totalPages}
            className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-40 hover:bg-muted"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  );
}
