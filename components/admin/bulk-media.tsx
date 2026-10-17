"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, ImageIcon, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEP, cell, parseCSV } from "@/lib/csv";
import { MEDIA_HEADERS, type MediaRow } from "@/lib/bulk-media";
import { bulkUpdateMedia, type BulkMediaResult } from "@/lib/actions/bulk-media";

/** Edit Massal → Media (foto), mirip "Info Media" Shopee. */
export function BulkMedia({ rows }: { rows: MediaRow[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkMediaResult | null>(null);
  const products = rows.filter((r) => r.jenis === "produk").length;

  function download() {
    const body = rows.map((r) => MEDIA_HEADERS.map((h) => cell(r[h] ?? "")).join(SEP)).join("\n");
    const csv = MEDIA_HEADERS.join(SEP) + "\n" + body + "\n";
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM → Excel baca UTF-8
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `media-produk-snapfit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((t) => { setText(t); setResult(null); });
    e.target.value = "";
  }

  const parsed = (() => {
    if (!text.trim()) return { headers: [] as string[], rows: [] as MediaRow[] };
    const grid = parseCSV(text);
    if (grid.length < 2) return { headers: [], rows: [] };
    const headers = grid[0]!.map((h) => h.trim().replace(/^﻿/, ""));
    const data = grid.slice(1).map((cols) => {
      const o: MediaRow = {};
      headers.forEach((h, i) => (o[h] = (cols[i] ?? "").trim()));
      return o;
    });
    return { headers, rows: data.filter((r) => r.productId) };
  })();
  const isMediaFile = parsed.headers.includes("productId") && parsed.headers.includes("jenis");

  async function submit() {
    if (!parsed.rows.length) return;
    setBusy(true);
    setResult(null);
    const res = await bulkUpdateMedia(parsed.rows, parsed.headers).catch(
      (): BulkMediaResult => ({ ok: false, productsUpdated: 0, variantsUpdated: 0, imported: 0, skipped: 0, errors: ["Gagal menerapkan. Coba lagi."] }),
    );
    setResult(res);
    setBusy(false);
    if (res.productsUpdated || res.variantsUpdated) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="size-4" /> Media (foto)
        </h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li><b>Unduh CSV Media</b> — berisi alamat foto semua produk ({products} produk) → buka di Excel/Google Sheets.</li>
          <li>
            Baris <code>produk</code>: ubah <code>foto_sampul</code> &amp; <code>foto_2</code>–<code>foto_9</code> (galeri, urutan = urutan tampil;
            kosongkan sel untuk menghapus foto). Baris <code>variasi</code>: ubah <code>foto_variasi</code> (dipakai semua varian dengan opsi itu).
          </li>
          <li>Isi dengan <b>alamat foto</b> (https://…) — foto dari Shopee/TikTok/web lain otomatis disalin ke CDN SNAPFIT.</li>
          <li><b>Jangan ubah</b> kolom <code>productId</code>, <code>jenis</code> &amp; <code>variasi</code>. Simpan sebagai CSV lalu upload &amp; Terapkan.</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          <code>foto_sampul</code> wajib terisi. <code>foto_variasi</code> kosong = tidak diubah. Baris yang tidak diubah aman dibiarkan.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="size-4" /> Unduh CSV Media ({products} produk)
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Upload className="size-4" /> Upload CSV Media hasil edit
              <input type="file" accept=".csv,text/csv,text/plain" hidden onChange={onFile} />
            </label>
          </Button>
        </div>
      </div>

      {text.trim() && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          {isMediaFile ? (
            <p className="text-sm text-muted-foreground">
              Terbaca: <b className="text-foreground">{parsed.rows.filter((r) => r.jenis === "produk").length}</b> baris produk &amp;{" "}
              <b className="text-foreground">{parsed.rows.filter((r) => r.jenis === "variasi").length}</b> baris variasi. Hanya yang berubah yang disimpan.
            </p>
          ) : (
            <p className="text-sm text-destructive">Ini bukan file CSV Media (kolom productId &amp; jenis tidak ditemukan). Pakai file dari tombol Unduh CSV Media.</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <Button type="button" onClick={submit} disabled={busy || !isMediaFile || !parsed.rows.length}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              {busy ? "Menerapkan… (foto dari luar sedang disalin)" : "Terapkan perubahan media"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setText(""); setResult(null); }} disabled={busy}>
              Bersihkan
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-sm">
            ✅ <b>{result.productsUpdated}</b> produk &amp; <b>{result.variantsUpdated}</b> varian diperbarui
            {result.imported > 0 && <> · 📥 {result.imported} foto disalin ke CDN</>}
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
