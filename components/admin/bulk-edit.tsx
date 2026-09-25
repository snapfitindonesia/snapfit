"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkUpdateProducts, type BulkEditRow } from "@/lib/actions/admin";

export type EditRow = {
  variantId: string;
  productId: string;
  nama_produk: string;
  brand: string;
  varian: string;
  sku: string;
  harga: number;
  stok: number;
  berat: number;
};

const HEADERS = ["variantId", "productId", "nama_produk", "brand", "varian", "sku", "harga", "stok", "berat"] as const;

// Bungkus sel CSV bila mengandung koma/kutip/baris baru.
function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function BulkEdit({ rows }: { rows: EditRow[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ variantsUpdated: number; productsUpdated: number; skipped: number; errors: string[] } | null>(null);

  function download() {
    const body = rows
      .map((r) => [r.variantId, r.productId, r.nama_produk, r.brand, r.varian, r.sku, r.harga, r.stok, r.berat].map(cell).join(","))
      .join("\n");
    const csv = HEADERS.join(",") + "\n" + body + "\n";
    // BOM agar Excel baca UTF-8 dengan benar.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `produk-snapfit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(setText);
    e.target.value = "";
  }

  const parsed: BulkEditRow[] = (() => {
    if (!text.trim()) return [];
    const grid = parseCSV(text);
    if (grid.length < 2) return [];
    const header = grid[0].map((h) => h.trim().replace(/^﻿/, ""));
    return grid.slice(1).map((cols) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
      return o as BulkEditRow;
    });
  })();
  const editableCount = parsed.filter((r) => r.variantId).length;

  async function submit() {
    if (!editableCount) return;
    setBusy(true);
    setResult(null);
    const res = await bulkUpdateProducts(parsed);
    setResult(res);
    setBusy(false);
    if (res.variantsUpdated > 0 || res.productsUpdated > 0) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Cara pakai</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li><b>Unduh CSV</b> berisi semua varian ({rows.length} baris) → buka di Excel/Google Sheets.</li>
          <li>Edit kolom <code>harga</code>, <code>stok</code>, <code>sku</code>, <code>berat</code> (per varian) atau <code>nama_produk</code>/<code>brand</code> (per produk).</li>
          <li><b>Jangan ubah</b> kolom <code>variantId</code> &amp; <code>productId</code> — itu kunci pencocokan. Kolom <code>varian</code> hanya acuan.</li>
          <li>Simpan sebagai <b>CSV</b>, lalu upload di bawah &amp; klik Terapkan.</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">Kosongkan sel <code>brand</code> = hapus merek produk. Sel <code>harga/stok</code> kosong = tidak diubah.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="size-4" /> Unduh CSV ({rows.length} varian)
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            <Upload className="size-4" /> Upload CSV hasil edit
            <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </label>
        </div>
      </div>

      {text.trim() && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Terbaca: <b className="text-foreground">{editableCount}</b> baris varian siap diperbarui.</p>
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" onClick={submit} disabled={busy || !editableCount}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Terapkan perubahan
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setText(""); setResult(null); }}>Bersihkan</Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm">
            ✅ <b>{result.variantsUpdated}</b> varian &amp; <b>{result.productsUpdated}</b> produk diperbarui
            {result.skipped > 0 && <> · ⏭️ {result.skipped} dilewati</>}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
              {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
