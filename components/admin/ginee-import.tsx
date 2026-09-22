"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, PackagePlus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { searchGineeForImport, importGineeProducts } from "@/lib/actions/ginee";
import type { GineeMasterProduct } from "@/lib/ginee/products";

type Item = { productId: string; name: string; image: string; variantCount: number; stock: number };

const QUICK = ["Fold 8", "iPhone 18 Pro Max", "S26 Ultra"];

export function GineeImport() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [raw, setRaw] = useState<Map<string, GineeMasterProduct>>(new Map());
  const [total, setTotal] = useState<number | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errList, setErrList] = useState<string[]>([]);

  async function search(kw: string) {
    setKeyword(kw);
    setLoading(true);
    setMsg(null);
    setErrList([]);
    const res = await searchGineeForImport(kw);
    setLoading(false);
    if (!res.ok) {
      setItems([]);
      setTotal(null);
      setMsg(res.error);
      return;
    }
    setItems(res.items);
    setRaw(new Map(res.raw.map((p) => [p.productId, p])));
    setTotal(res.total);
    setChecked({});
  }

  const selectedIds = Object.keys(checked).filter((id) => checked[id]);

  async function doImport() {
    const payload = selectedIds
      .map((id) => ({ product: raw.get(id), price: Math.round(Number(prices[id] || 0)) }))
      .filter((x): x is { product: GineeMasterProduct; price: number } => Boolean(x.product));
    if (!payload.length) return;

    setImporting(true);
    setMsg(null);
    setErrList([]);
    const res = await importGineeProducts(payload);
    setImporting(false);
    setMsg(`Impor selesai: ${res.created} dibuat, ${res.skipped} dilewati.`);
    setErrList(res.errors.slice(0, 10));
    if (res.created > 0) {
      setChecked({});
      router.refresh();
    }
  }

  return (
    <div>
      {/* Pencarian */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(keyword)}
            placeholder="Cari produk Ginee (mis. Fold 8, iPhone 18, S26)…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
          />
        </div>
        <Button onClick={() => search(keyword)} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Cari
        </Button>
      </div>

      {/* Chip kata kunci cepat */}
      <div className="mt-2 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => search(q)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>

      {total !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          {total} hasil untuk “{keyword}”. Menampilkan {items.length} pertama. Centang + isi harga → Impor.
        </p>
      )}

      {msg && <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{msg}</p>}
      {errList.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
          {errList.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}

      {/* Hasil */}
      <div className="mt-4 space-y-2">
        {items.map((it) => {
          const on = !!checked[it.productId];
          return (
            <div
              key={it.productId}
              className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${on ? "border-foreground bg-muted/30" : "border-border"}`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => setChecked((c) => ({ ...c, [it.productId]: e.target.checked }))}
                className="size-4"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.image || "https://placehold.co/64"}
                alt=""
                className="size-12 shrink-0 rounded-md border border-border object-cover"
              />
              <div className="min-w-[180px] flex-1">
                <p className="line-clamp-2 text-sm font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  {it.variantCount} varian · stok {it.stock}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rp</span>
                <input
                  type="number"
                  min={0}
                  value={prices[it.productId] ?? ""}
                  onChange={(e) => setPrices((p) => ({ ...p, [it.productId]: e.target.value }))}
                  placeholder="harga"
                  className="w-28 rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground"
                />
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 0 && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} dipilih
            {selectedIds.length > 0 && (() => {
              const sum = selectedIds.reduce((n, id) => n + Number(prices[id] || 0), 0);
              return sum > 0 ? ` · total harga contoh ${formatRupiah(sum)}` : "";
            })()}
          </span>
          <Button onClick={doImport} disabled={importing || selectedIds.length === 0}>
            {importing ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
            Impor terpilih ({selectedIds.length})
          </Button>
        </div>
      )}

      {items.length === 0 && total === null && !loading && (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Store className="size-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cari produk dari Ginee untuk diimpor.</p>
        </div>
      )}
    </div>
  );
}
