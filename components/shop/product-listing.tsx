"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/shop/product-card";
import { SORT_OPTIONS, type SortOption } from "@/lib/validations/product";
import type { ProductListItem, ProductListResult } from "@/lib/actions/product";

const TAKE = 8;

const SORT_LABEL: Record<SortOption, string> = {
  terbaru: "Terbaru",
  termurah: "Harga termurah",
  termahal: "Harga termahal",
};

type Category = { name: string; slug: string };

export function ProductListing({
  categories,
  initial,
  initialTipe = "",
  initialModel = "",
  initialSort = "terbaru",
  initialQ = "",
}: {
  categories: Category[];
  initial: ProductListResult;
  initialTipe?: string;
  initialModel?: string;
  initialSort?: SortOption;
  initialQ?: string;
}) {
  const [tipe, setTipe] = useState(initialTipe);
  const [model, setModel] = useState(initialModel);
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [q, setQ] = useState(initialQ);
  const [items, setItems] = useState<ProductListItem[]>(initial.items);
  const [total, setTotal] = useState(initial.total);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false); // toggle filter kategori di mobile

  // Anti race-condition saat filter/sort di-klik cepat
  const reqId = useRef(0);
  const firstRender = useRef(true);

  const fetchList = useCallback(
    async (opts: { tipe: string; model: string; q: string; sort: SortOption; skip: number; append: boolean }) => {
      const id = ++reqId.current;
      setLoading(true);
      setError(false);
      try {
        const params = new URLSearchParams({
          sort: opts.sort,
          skip: String(opts.skip),
          take: String(TAKE),
        });
        if (opts.tipe) params.set("tipe", opts.tipe);
        if (opts.model) params.set("model", opts.model);
        if (opts.q) params.set("q", opts.q);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (!res.ok) throw new Error("gagal");
        const data: ProductListResult = await res.json();
        if (id !== reqId.current) return; // hasil basi, abaikan

        setItems((prev) => (opts.append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setHasMore(data.hasMore);
      } catch {
        if (id === reqId.current) setError(true);
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [],
  );

  // Saat filter/sort berubah → reset & fetch dari awal (skip 0). Lewati render pertama
  // (data awal sudah dari RSC). Sinkronkan URL tanpa memicu navigasi/reload.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Debounce (mengetik search & klik cepat): tunggu 250ms sebelum fetch
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (tipe) params.set("tipe", tipe);
      if (model) params.set("model", model);
      if (q) params.set("q", q);
      if (sort !== "terbaru") params.set("sort", sort);
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `/produk?${qs}` : "/produk");
      fetchList({ tipe, model, q, sort, skip: 0, append: false });
    }, 250);
    return () => clearTimeout(t);
  }, [tipe, model, sort, q, fetchList]);

  const chips = [{ name: "Semua", slug: "" }, ...categories];
  const activeName = chips.find((c) => c.slug === tipe)?.name ?? "Semua";

  // Daftar kategori (vertikal) — dipakai sidebar desktop & panel mobile.
  const CategoryList = (
    <nav className="flex flex-col gap-0.5" role="group" aria-label="Filter kategori">
      {chips.map((c) => (
        <button
          key={c.slug || "all"}
          type="button"
          onClick={() => {
            setTipe(c.slug);
            setModel(""); // model terikat ke line tertentu — reset saat ganti filter
            setFiltersOpen(false);
          }}
          aria-pressed={tipe === c.slug}
          className={cn(
            "rounded-md px-3 py-1.5 text-left text-sm transition-colors",
            tipe === c.slug
              ? "bg-foreground font-medium text-background"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {c.name}
        </button>
      ))}
    </nav>
  );

  return (
    <div>
      {/* Kotak pencarian */}
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

      <div className="lg:grid lg:grid-cols-[210px_1fr] lg:gap-8">
        {/* Sidebar kategori */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* Mobile: tombol toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm font-medium lg:hidden"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="size-4" />
              Kategori: <span className="text-muted-foreground">{activeName}</span>
            </span>
            <span className="text-muted-foreground">{filtersOpen ? "▲" : "▼"}</span>
          </button>

          <div className={cn("mt-2 lg:mt-0 lg:block", filtersOpen ? "block" : "hidden")}>
            <p className="mb-2 hidden px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:block">
              Kategori
            </p>
            <div className="lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-1">
              {CategoryList}
            </div>
          </div>
        </aside>

        {/* Konten utama */}
        <div className="mt-4 lg:mt-0">
          {/* Bar atas: jumlah + sort */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {total} produk
            </p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="sr-only sm:not-sr-only">Urutkan</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {SORT_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Filter model aktif (dari picker homepage) — bisa dilepas */}
          {model && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Model:</span>
              <button
                type="button"
                onClick={() => setModel("")}
                className="inline-flex items-center gap-1 rounded-full border border-foreground bg-foreground px-3 py-1 text-sm font-medium text-background"
              >
                {model}
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* Grid: mobile 2 kolom → desktop 3 kolom (area lebih sempit karena sidebar) */}
          {items.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            !loading && (
              <p className="mt-12 text-center text-sm text-muted-foreground">
                {q
                  ? `Tak ada produk cocok dengan "${q}".`
                  : "Belum ada produk untuk filter ini."}
              </p>
            )
          )}

          {error && (
            <p className="mt-6 text-center text-sm text-destructive">
              Gagal memuat. Coba lagi.
            </p>
          )}

          {/* Load more (AJAX, tanpa reload) */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <Button
                variant="outline"
                size="lg"
                disabled={loading}
                onClick={() => fetchList({ tipe, model, q, sort, skip: items.length, append: true })}
              >
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
