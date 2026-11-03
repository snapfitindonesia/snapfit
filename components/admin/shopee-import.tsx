"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Loader2, PackagePlus, Search, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readSpreadsheets } from "@/lib/xlsx-read";
import { parseShopeeMassUpdate, type ShopeeProduct } from "@/lib/shopee/mass-update";
import { findExistingShopeeNames, importShopeeProducts } from "@/lib/actions/shopee";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const isPromoName = (n: string) => /buy\s*1\s*get\s*1|b1g1/i.test(n);

export function ShopeeImport() {
  const router = useRouter();
  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const [reading, setReading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyPromo, setOnlyPromo] = useState(true);
  const [asPromo, setAsPromo] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errList, setErrList] = useState<string[]>([]);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setReading(true);
    setMsg(null);
    setErrList([]);
    try {
      const read = (await Promise.all([...list].map(async (f) => readSpreadsheets(f.name, new Uint8Array(await f.arrayBuffer()))))).flat();
      const res = parseShopeeMassUpdate(read);
      setProducts(res.products);
      setFiles([...list].map((f) => f.name));
      setSheets(res.sheetsUsed);
      setWarnings(res.warnings);
      setChecked({});
      setExisting(new Set((await findExistingShopeeNames(res.products.map((p) => p.name))).map((n) => n.toLowerCase())));
      if (!res.products.length) setMsg("Tidak ada produk terbaca. Pastikan file berasal dari Seller Center → Produk Saya → Ubah Massal → Download.");
    } catch (e) {
      setMsg(`File gagal dibaca: ${e instanceof Error ? e.message : "?"}. Pastikan formatnya .xlsx.`);
    }
    setReading(false);
  }

  const isDone = (p: ShopeeProduct) => existing.has(p.name.toLowerCase());
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const visible = useMemo(
    () =>
      products.filter(
        (p) => (!onlyPromo || isPromoName(p.name)) && words.every((w) => `${p.name} ${p.parentSku} ${p.variants.map((v) => v.sku).join(" ")}`.toLowerCase().includes(w)),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, onlyPromo, q],
  );
  const selectable = visible.filter((p) => !isDone(p));
  const selected = selectable.filter((p) => checked[p.id]);
  const allChecked = selectable.length > 0 && selected.length === selectable.length;
  const noImages = products.length > 0 && products.every((p) => !p.images.length);

  async function doImport() {
    if (!selected.length) return;
    setImporting(true);
    setMsg(null);
    setErrList([]);
    const res = { created: 0, skipped: 0, errors: [] as string[] };
    for (let i = 0; i < selected.length; i += 3) {
      setMsg(`Mengimpor ${Math.min(i + 3, selected.length)}/${selected.length} produk… (foto ke CDN, stok gudang Ginee)`);
      try {
        const r = await importShopeeProducts(selected.slice(i, i + 3), asPromo);
        res.created += r.created;
        res.skipped += r.skipped;
        res.errors.push(...r.errors);
      } catch (e) {
        res.skipped += selected.slice(i, i + 3).length;
        res.errors.push(`Batch ${i / 3 + 1}: ${e instanceof Error ? e.message : "gagal"}`);
      }
    }
    setImporting(false);
    setMsg(
      `Impor selesai: ${res.created} dibuat${asPromo && res.created ? " & dimasukkan ke halaman /buy1get1 (hanya di halaman promo)" : ""}, ${res.skipped} dilewati.`,
    );
    setErrList(res.errors.slice(0, 10));
    if (res.created > 0) {
      setExisting(new Set([...existing, ...selected.map((p) => p.name.toLowerCase())]));
      setChecked({});
      router.refresh();
    }
  }

  return (
    <div>
      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
        <p className="font-semibold">1. Download dari Shopee Seller Center</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Produk Saya → <b>Ubah Massal</b> → Download: template <b>Informasi Dasar</b>, <b>Informasi Penjualan</b>,{" "}
          <b>Informasi Media</b> (+ <b>Informasi Pengiriman</b> untuk berat). Kategori &amp; status: Semua.
        </p>
        <p className="mt-3 font-semibold">2. Upload semua file sekaligus (.xlsx, atau .zip apa adanya dari Shopee)</p>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:border-foreground">
          {reading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Pilih file .xlsx / .zip
          <input type="file" accept=".xlsx,.zip" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        </label>
        {files.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {files.map((f) => (
              <li key={f} className="flex items-center gap-1.5"><FileSpreadsheet className="size-3.5" /> {f}</li>
            ))}
          </ul>
        )}
        {sheets.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Terbaca: {sheets.join(" · ")}</p>}
        {warnings.map((w) => <p key={w} className="mt-1 text-xs text-rose-700">{w}</p>)}
        {noImages && <p className="mt-1 text-xs text-rose-700">Belum ada foto — tambahkan file <b>Informasi Media</b>.</p>}
      </div>

      {products.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Saring nama / SKU…"
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-foreground"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)} className="size-4" />
              Hanya judul “Buy 1 Get 1”
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => setChecked(allChecked ? {} : Object.fromEntries(selectable.map((p) => [p.id, true])))}
                className="size-4"
              />
              Centang semua
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {products.length} produk di file · tampil {visible.length}
          </p>

          {msg && <p className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{msg}</p>}
          {errList.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
              {errList.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}

          <div className="mt-3 space-y-2">
            {visible.map((p) => {
              const done = isDone(p);
              const prices = p.variants.map((v) => v.price).filter((n) => n > 0);
              const lo = prices.length ? Math.min(...prices) : 0;
              const hi = prices.length ? Math.max(...prices) : 0;
              const on = !!checked[p.id];
              return (
                <label
                  key={p.id}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${done ? "border-border bg-muted/40 opacity-70" : on ? "cursor-pointer border-foreground bg-muted/30" : "cursor-pointer border-border"}`}
                >
                  {done ? (
                    <div className="size-4 shrink-0" />
                  ) : (
                    <input type="checkbox" checked={on} onChange={(e) => setChecked((c) => ({ ...c, [p.id]: e.target.checked }))} className="size-4" />
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0] || p.variants.find((v) => v.image)?.image || "https://placehold.co/64"} alt="" loading="lazy" className="size-12 shrink-0 rounded-md border border-border object-cover" />
                  <div className="min-w-[180px] flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.variants.length} varian · {lo ? (lo === hi ? rp(lo) : `${rp(lo)}–${rp(hi)}`) : "harga ?"} · {p.images.length} foto
                      {p.variants[0]?.sku && <> · SKU {p.variants[0].sku}{p.variants.length > 1 && "…"}</>}
                      {!p.images.length && !p.variants.some((v) => v.image) && (
                        <span className="ml-1.5 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">TANPA FOTO</span>
                      )}
                    </p>
                  </div>
                  {done && <span className="rounded-[5px] bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">✓ Sudah ada</span>}
                </label>
              );
            })}
          </div>

          <div className="sticky bottom-0 mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={asPromo} onChange={(e) => setAsPromo(e.target.checked)} className="size-4" />
              Masukkan ke halaman <b>/buy1get1</b> (hanya di halaman promo)
            </label>
            <Button onClick={doImport} disabled={importing || !selected.length}>
              {importing ? <Loader2 className="size-4 animate-spin" /> : <PackagePlus className="size-4" />}
              Impor terpilih ({selected.length})
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
