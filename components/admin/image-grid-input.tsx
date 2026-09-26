"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, X, ChevronLeft, ChevronRight, ClipboardPaste } from "lucide-react";
import { uploadImageFile, importImageUrl, readPastedImages, hasPastedImages } from "@/lib/upload/client";

const MAX = 9;

/**
 * Grid foto produk ala Tokopedia/Shopee.
 * value[0] = foto utama (cover), sisanya = galeri.
 * Bisa upload banyak sekaligus, hapus, dan set "Jadikan utama".
 * Tempel (Ctrl+V) di mana saja di halaman: gambar dari clipboard ("Salin gambar"
 * di Shopee dll) atau alamat gambar → langsung diunggah ke CDN.
 */
export function ImageGridInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const photos = value.filter(Boolean);
  const canAdd = photos.length < MAX;

  const uploadOne = uploadImageFile;

  // Tambah foto dari file / alamat gambar (maks sisa slot), berurutan.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  async function addSources(files: File[], urls: string[]) {
    const slots = MAX - photosRef.current.length;
    if (slots <= 0) { setError(`Maksimal ${MAX} foto.`); return; }
    setUploading(true);
    setError(null);
    const added: string[] = [];
    const fails: string[] = [];
    for (const f of files.slice(0, slots)) {
      try { added.push(await uploadImageFile(f)); } catch (e) { fails.push(e instanceof Error ? e.message : "gagal"); }
    }
    for (const u of urls.slice(0, slots - added.length)) {
      try { added.push(await importImageUrl(u)); } catch (e) { fails.push(e instanceof Error ? e.message : "gagal"); }
    }
    if (added.length) onChange([...photosRef.current, ...added]);
    if (fails.length) setError(fails[0]);
    setUploading(false);
  }

  // Ctrl+V di mana saja di halaman (kecuali saat mengetik di kolom teks lain).
  const addRef = useRef(addSources);
  addRef.current = addSources;
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) && !t.dataset.imagePaste) return;
      const p = readPastedImages(e.clipboardData);
      if (!hasPastedImages(p)) return;
      e.preventDefault();
      void addRef.current(p.files, p.urls);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      const slots = MAX - photos.length;
      const urls: string[] = [];
      for (const f of files.slice(0, slots)) urls.push(await uploadOne(f));
      onChange([...photos, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(i: number) {
    onChange(photos.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= photos.length) return;
    const next = [...photos];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  // Drag & drop: pindahkan foto dari posisi `from` ke `to` (sisip, bukan tukar).
  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || from >= photos.length || to >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }
  // Alamat gambar diunduh server lalu disimpan di CDN sendiri (bukan numpang hotlink).
  async function addUrl() {
    const u = urlDraft.trim();
    if (!u) return;
    setUrlDraft("");
    await addSources([], [u]);
  }

  return (
    <div>
      {photos.length > 1 && (
        <p className="mb-1.5 text-[11px] text-muted-foreground">Foto pertama = cover. <b>Seret</b> untuk mengurutkan (atau geser ◀ ▶). </p>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((src, i) => (
          <div
            key={`${src}-${i}`}
            draggable
            onDragStart={(e) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(i)); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overIdx !== i) setOverIdx(i); }}
            onDragLeave={() => setOverIdx((v) => (v === i ? null : v))}
            onDrop={(e) => { e.preventDefault(); if (dragIdx !== null) reorder(dragIdx, i); setDragIdx(null); setOverIdx(null); }}
            onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
            className={`group relative aspect-square cursor-move overflow-hidden rounded-lg border bg-muted transition-all ${
              dragIdx === i ? "opacity-40" : overIdx === i ? "border-brand ring-2 ring-brand/40" : "border-border"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="size-full object-contain" />

            {i === 0 && (
              <span className="absolute left-0 top-0 rounded-br-md bg-brand px-1.5 py-0.5 text-[10px] font-medium text-brand-foreground">
                Cover
              </span>
            )}

            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
              aria-label="Hapus foto"
            >
              <X className="size-3" />
            </button>

            {/* Geser urutan — foto pertama = cover */}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Geser ke kiri"
                className="grid flex-1 place-items-center py-1 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === photos.length - 1}
                aria-label="Geser ke kanan"
                className="grid flex-1 place-items-center py-1 text-white hover:bg-white/20 disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {canAdd && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {uploading ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            <span className="text-[11px]">{uploading ? "Mengunggah…" : "Unggah gambar"}</span>
            <span className="text-[10px]">{photos.length}/{MAX}</span>
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ClipboardPaste className="size-3.5 shrink-0" />
        <span><b>Tempel langsung:</b> klik kanan foto di Shopee → <i>Salin gambar</i>, lalu tekan <b>Ctrl+V</b> di halaman ini.</span>
      </p>

      {/* Tempel alamat gambar (diunduh ke CDN) */}
      <div className="mt-2 flex gap-2">
        <input
          data-image-paste="1"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="atau tempel alamat gambar (https://…)"
          className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-brand"
        />
        <button type="button" onClick={addUrl} className="shrink-0 rounded-md border border-border px-3 text-xs hover:bg-muted">
          Tambah
        </button>
      </div>

      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  );
}
