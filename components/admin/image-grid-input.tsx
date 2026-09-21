"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X, Star } from "lucide-react";

const MAX = 9;

/**
 * Grid foto produk ala Tokopedia/Shopee.
 * value[0] = foto utama (cover), sisanya = galeri.
 * Bisa upload banyak sekaligus, hapus, dan set "Jadikan utama".
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

  const photos = value.filter(Boolean);
  const canAdd = photos.length < MAX;

  async function uploadOne(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Upload gagal");
    return data.url as string;
  }

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
  function makeMain(i: number) {
    if (i === 0) return;
    const next = [...photos];
    const [pick] = next.splice(i, 1);
    onChange([pick, ...next]);
  }
  function addUrl() {
    const u = urlDraft.trim();
    if (!u) return;
    if (photos.length >= MAX) { setError(`Maksimal ${MAX} foto.`); return; }
    onChange([...photos, u]);
    setUrlDraft("");
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((src, i) => (
          <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="size-full object-contain" />
            {i === 0 ? (
              <span className="absolute inset-x-0 bottom-0 bg-brand/90 py-0.5 text-center text-[10px] font-medium text-brand-foreground">
                Foto utama
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeMain(i)}
                className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Star className="size-3" /> Jadikan utama
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-destructive"
              aria-label="Hapus foto"
            >
              <X className="size-3" />
            </button>
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

      {/* Fallback tempel URL */}
      <div className="mt-2 flex gap-2">
        <input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="atau tempel URL gambar…"
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
