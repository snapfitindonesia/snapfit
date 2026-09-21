"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkImportProducts, type BulkRow } from "@/lib/actions/admin";

const HEADERS = [
  "slug", "name", "category", "description", "coverImage", "images", "isGrosir", "weight",
  "variasi1", "opsi1", "foto_opsi1", "variasi2", "opsi2", "harga", "stok", "sku",
] as const;

const TEMPLATE =
  HEADERS.join(",") +
  "\n" +
  [
    "case-carbon-15,Case Carbon iPhone 15,iPhone,Case karbon premium,https://cdn.snapfit.id/carbon-15-hitam.jpg,https://cdn.snapfit.id/carbon-15-b.jpg|https://cdn.snapfit.id/carbon-15-c.jpg,false,200,Warna,Hitam,https://cdn.snapfit.id/carbon-15-hitam.jpg,Tipe,iPhone 15,175000,20,",
    "case-carbon-15,Case Carbon iPhone 15,iPhone,,,,,,Warna,Hitam,,Tipe,iPhone 15 Pro,185000,15,",
    "case-carbon-15,Case Carbon iPhone 15,iPhone,,,,,,Warna,Biru,https://cdn.snapfit.id/carbon-15-biru.jpg,Tipe,iPhone 15,175000,10,",
  ].join("\n") + "\n";

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

function toRows(text: string): { rows: BulkRow[]; products: number; variants: number } {
  const grid = parseCSV(text);
  if (grid.length < 2) return { rows: [], products: 0, variants: 0 };
  const header = grid[0].map((h) => h.trim());
  const rows: BulkRow[] = grid.slice(1).map((cols) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
    return o as BulkRow;
  });
  const slugs = new Set(rows.map((r) => (r.slug || r.name || "").toLowerCase()));
  const variants = rows.filter((r) => (r.harga ?? "").trim() !== "").length;
  return { rows, products: slugs.size, variants };
}

export function BulkImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  const parsed = text.trim() ? toRows(text) : { rows: [], products: 0, variants: 0 };

  function download() {
    const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "template-produk-snapfit.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then(setText);
    e.target.value = "";
  }

  async function submit() {
    if (!parsed.rows.length) return;
    setBusy(true);
    setResult(null);
    const res = await bulkImportProducts(parsed.rows);
    setResult(res);
    setBusy(false);
    if (res.created > 0) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold">Cara pakai</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Unduh template CSV, isi di Excel/Google Sheets.</li>
          <li><b>1 baris = 1 varian.</b> Baris dengan <code>slug</code> sama = 1 produk. Kolom produk (name, coverImage, dll) cukup diisi di baris pertama tiap slug.</li>
          <li>Foto pakai URL <code>cdn.snapfit.id</code> (upload dulu ke cPanel). Galeri: pisah dengan <code>|</code>.</li>
          <li><code>variasi2</code>/<code>opsi2</code> boleh kosong bila cuma 1 tingkat variasi.</li>
          <li>Tempel isi CSV di bawah / upload file, cek pratinjau, lalu Impor.</li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="size-4" /> Unduh template CSV
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            <Upload className="size-4" /> Upload file .csv
            <input type="file" accept=".csv,text/csv" hidden onChange={onFile} />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <label className="text-sm font-medium">Tempel data CSV</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          placeholder="slug,name,category,...  (tempel isi CSV di sini)"
          className="mt-2 w-full rounded-md border border-border bg-background p-3 font-mono text-xs outline-none focus:border-brand"
        />
        {text.trim() && (
          <p className="mt-2 text-sm text-muted-foreground">
            Terbaca: <b className="text-foreground">{parsed.products} produk</b> · {parsed.variants} varian
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={submit} disabled={busy || !parsed.products}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            Impor {parsed.products || ""} produk
          </Button>
          {text && <Button type="button" variant="ghost" onClick={() => { setText(""); setResult(null); }}>Bersihkan</Button>}
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm">
            ✅ Berhasil buat <b>{result.created}</b> produk
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
