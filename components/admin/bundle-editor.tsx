"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { saveCartBundles, searchBundleVariants } from "@/lib/actions/bundles";
import { MAX_BUNDLES, type BundleConfig, type BundleItem } from "@/lib/bundles-shared";

export function BundleEditor({ config, items }: { config: BundleConfig; items: BundleItem[] }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config.enabled);
  const [title, setTitle] = useState(config.title);
  const [list, setList] = useState<BundleItem[]>(items);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<BundleItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Varian tersimpan yang kini habis/diarsip tak ikut dimuat → beri tahu admin.
  const hidden = config.variantIds.length - items.length;

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    setResults(await searchBundleVariants(q));
    setSearching(false);
  }

  const has = new Set(list.map((b) => b.variantId));
  const move = (i: number, d: -1 | 1) =>
    setList((l) => {
      const n = [...l];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveCartBundles({ enabled, title, variantIds: list.map((b) => b.variantId) });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Tersimpan — tampil di keranjang dalam beberapa detik." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Gagal menyimpan." });
  }

  const row = (b: BundleItem) => (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- thumbnail admin */}
      <img src={b.image} alt="" className="size-12 shrink-0 rounded-lg border border-border bg-background object-contain" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-1 text-sm font-medium">{b.productName}</span>
        <span className="block text-xs text-muted-foreground">
          {b.variantName} ·{" "}
          {b.finalPrice < b.price && <span className="line-through">{formatRupiah(b.price)}</span>} {formatRupiah(b.finalPrice)}
        </span>
      </span>
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4">
        <div className="rounded-lg border border-border p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="mt-0.5 size-4 accent-foreground" />
            <span>
              <span className="block text-sm font-medium">Tampilkan di keranjang</span>
              <span className="block text-xs text-muted-foreground">Muncul di bawah daftar barang pada keranjang samping (drawer).</span>
            </span>
          </label>
          <label className="mt-4 block">
            <span className="text-xs font-medium">Judul</span>
            <input
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-medium">
            Produk bundle ({list.length}/{MAX_BUNDLES})
          </p>
          <p className="text-xs text-muted-foreground">
            Urutan = urutan tampil. Produk yang sudah ada di keranjang pembeli, stok habis, atau diarsipkan otomatis disembunyikan.
          </p>
          {hidden > 0 && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {hidden} varian tersimpan sedang tidak tampil (stok habis / diarsipkan) — akan dihapus dari daftar saat Anda menyimpan.
            </p>
          )}
          {list.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Belum ada produk. Cari dan tambahkan di sebelah kanan.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
              {list.map((b, i) => (
                <li key={b.variantId} className="flex items-center gap-3 p-3">
                  <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  {row(b)}
                  <span className="flex shrink-0 gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Naikkan" className="rounded p-1.5 hover:bg-muted disabled:opacity-30">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Turunkan" className="rounded p-1.5 hover:bg-muted disabled:opacity-30">
                      <ArrowDown className="size-4" />
                    </button>
                    <button type="button" onClick={() => setList((l) => l.filter((x) => x.variantId !== b.variantId))} aria-label="Hapus" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={busy || !title.trim()}>
            {busy && <Loader2 className="size-4 animate-spin" />}Simpan
          </Button>
          {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{msg.text}</span>}
        </div>
      </section>

      <section>
        <p className="text-sm font-medium">Tambah produk</p>
        <form onSubmit={search} className="mt-2 flex gap-2">
          <span className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-foreground">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama produk, varian, atau SKU (mis. airpods 4)"
              className="h-[40px] w-full bg-transparent text-sm outline-none"
            />
          </span>
          <Button type="submit" variant="outline" disabled={searching || !q.trim()}>
            {searching && <Loader2 className="size-4 animate-spin" />}Cari
          </Button>
        </form>
        {results && (
          results.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Tidak ada varian ber-stok yang cocok.</p>
          ) : (
            <ul className="mt-3 max-h-[560px] divide-y divide-border overflow-y-auto rounded-lg border border-border">
              {results.map((b) => (
                <li key={b.variantId} className="flex items-center gap-3 p-3">
                  {row(b)}
                  <button
                    type="button"
                    disabled={has.has(b.variantId) || list.length >= MAX_BUNDLES}
                    onClick={() => setList((l) => [...l, b])}
                    className="inline-flex h-[42px] shrink-0 items-center gap-1 rounded-xl border border-border px-3 text-sm font-medium hover:border-foreground disabled:opacity-40"
                  >
                    <Plus className="size-3.5" />
                    {has.has(b.variantId) ? "Ditambahkan" : "Tambah"}
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </div>
  );
}
