"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Search, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/shop/product-card";
import { SORT_OPTIONS, type SortOption, NO_BRAND } from "@/lib/validations/product";
import type { ProductListItem, ProductListResult } from "@/lib/actions/product";

const TAKE = 12;

const SORT_LABEL: Record<SortOption, string> = {
  terbaru: "Terbaru",
  termurah: "Harga termurah",
  termahal: "Harga termahal",
};

type Device = { name: string; slug: string };

export function ProductListing({
  devices,
  brands,
  hasNoBrand,
  initial,
  initialTipe = "",
  initialModel = "",
  initialSort = "terbaru",
  initialQ = "",
}: {
  devices: Device[];
  brands: string[];
  hasNoBrand: boolean;
  initial: ProductListResult;
  initialTipe?: string;
  initialModel?: string;
  initialSort?: SortOption;
  initialQ?: string;
}) {
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [selDevices, setSelDevices] = useState<Set<string>>(() => new Set(initialTipe ? [initialTipe] : []));
  const [selBrands, setSelBrands] = useState<Set<string>>(new Set());
  const [minInput, setMinInput] = useState("");
  const [maxInput, setMaxInput] = useState("");
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [items, setItems] = useState<ProductListItem[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const reqId = useRef(0);
  const firstRender = useRef(true);
  const model = initialModel;

  const buildParams = useCallback(
    (skip: number) => {
      const p = new URLSearchParams();
      selDevices.forEach((s) => p.append("perangkat", s));
      selBrands.forEach((b) => p.append("brand", b));
      if (priceMin != null) p.set("minPrice", String(priceMin));
      if (priceMax != null) p.set("maxPrice", String(priceMax));
      if (model) p.set("model", model);
      if (q.trim()) p.set("q", q.trim());
      if (sort !== "terbaru") p.set("sort", sort);
      p.set("skip", String(skip));
      p.set("take", String(TAKE));
      return p;
    },
    [selDevices, selBrands, priceMin, priceMax, model, q, sort],
  );

  const fetchList = useCallback(
    async (skip: number, append: boolean) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/products?${buildParams(skip).toString()}`);
        if (!res.ok) throw new Error("gagal");
        const data: ProductListResult = await res.json();
        if (id !== reqId.current) return;
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch {
        if (id === reqId.current) setError(true);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [buildParams],
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = buildParams(0);
      p.delete("skip");
      p.delete("take");
      const qs = p.toString();
      window.history.replaceState(null, "", qs ? `/produk?${qs}` : "/produk");
      fetchList(0, false);
    }, 250);
    return () => clearTimeout(t);
  }, [selDevices, selBrands, priceMin, priceMax, sort, q, buildParams, fetchList]);

  function toggleDevice(slug: string) {
    setSelDevices((s) => { const n = new Set(s); if (n.has(slug)) n.delete(slug); else n.add(slug); return n; });
  }
  function toggleBrand(b: string) {
    setSelBrands((s) => { const n = new Set(s); if (n.has(b)) n.delete(b); else n.add(b); return n; });
  }
  function applyPrice() {
    setPriceMin(minInput.trim() ? Math.max(0, Number(minInput)) : null);
    setPriceMax(maxInput.trim() ? Math.max(0, Number(maxInput)) : null);
  }
  function resetAll() {
    setQ("");
    setSort("terbaru");
    setSelDevices(new Set());
    setSelBrands(new Set());
    setMinInput(""); setMaxInput(""); setPriceMin(null); setPriceMax(null);
    setFiltersOpen(false);
  }

  const activeCount = selDevices.size + selBrands.size + (priceMin != null || priceMax != null ? 1 : 0);
  const brandOptions = useMemo(
    () => [...brands.map((b) => ({ key: b, label: b })), ...(hasNoBrand ? [{ key: NO_BRAND, label: "Tanpa Brand" }] : [])],
    [brands, hasNoBrand],
  );

  const Facet = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
  const Check = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
    <label className="flex cursor-pointer items-center gap-2 py-1 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 shrink-0 accent-foreground" />
      <span className="min-w-0 leading-snug">{label}</span>
    </label>
  );

  const sidebar = (
    <div className="space-y-4">
      {/* Harga */}
      <Facet title="Harga (IDR)">
        <div className="flex items-center gap-2">
          <input inputMode="numeric" value={minInput} onChange={(e) => setMinInput(e.target.value.replace(/\D/g, ""))} placeholder="Min"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground" />
          <span className="text-muted-foreground">–</span>
          <input inputMode="numeric" value={maxInput} onChange={(e) => setMaxInput(e.target.value.replace(/\D/g, ""))} placeholder="Max"
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground" />
        </div>
        <Button size="sm" className="mt-2 w-full" onClick={applyPrice}>Terapkan harga</Button>
      </Facet>

      {/* Brand */}
      {brandOptions.length > 0 && (
        <Facet title="Brand">
          <div className="max-h-56 overflow-y-auto pr-1">
            {brandOptions.map((b) => (
              <Check key={b.key} checked={selBrands.has(b.key)} onChange={() => toggleBrand(b.key)} label={b.label} />
            ))}
          </div>
        </Facet>
      )}

      {/* Perangkat */}
      {devices.length > 0 && (
        <Facet title="Perangkat">
          <div className="max-h-72 overflow-y-auto pr-1">
            {devices.map((d) => (
              <Check key={d.slug} checked={selDevices.has(d.slug)} onChange={() => toggleDevice(d.slug)} label={d.name} />
            ))}
          </div>
        </Facet>
      )}

      {activeCount > 0 && (
        <button onClick={resetAll} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Hapus semua filter
        </button>
      )}
    </div>
  );

  return (
    <div>
      {/* Pencarian */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari produk…"
          aria-label="Cari produk"
          className="w-full rounded-full border border-border bg-background py-2.5 pl-11 pr-4 text-sm outline-none transition-colors focus:border-foreground"
        />
      </div>

      <div className="lg:grid lg:grid-cols-[230px_1fr] lg:gap-8">
        {/* Sidebar filter */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm font-medium lg:hidden"
          >
            <span className="flex items-center gap-2"><SlidersHorizontal className="size-4" /> Filter{activeCount > 0 && <span className="rounded-full bg-foreground px-1.5 text-xs text-background">{activeCount}</span>}</span>
            <span className="text-muted-foreground">{filtersOpen ? "▲" : "▼"}</span>
          </button>
          <div className={cn("mt-3 rounded-xl border border-border p-4 lg:mt-0 lg:block", filtersOpen ? "block" : "hidden")}>
            {sidebar}
          </div>
        </aside>

        {/* Konten */}
        <div className="mt-4 lg:mt-0">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">{total} produk</p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only sm:not-sr-only">Urutkan</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground">
                {SORT_OPTIONS.map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
              </select>
            </label>
          </div>

          {model && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Model:</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-foreground bg-foreground px-3 py-1 text-sm font-medium text-background">{model}</span>
            </div>
          )}

          {items.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
              {items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            !loading && (
              <p className="mt-12 text-center text-sm text-muted-foreground">
                {q ? `Tak ada produk cocok dengan "${q}".` : "Tidak ada produk untuk filter ini."}
              </p>
            )
          )}

          {error && <p className="mt-6 text-center text-sm text-destructive">Gagal memuat. Coba lagi.</p>}

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <Button variant="outline" size="lg" disabled={loading} onClick={() => fetchList(items.length, true)}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Muat lebih banyak
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
