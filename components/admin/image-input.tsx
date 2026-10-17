"use client";

import { useRef, useState } from "react";
import { Loader2, Pencil, Upload } from "lucide-react";
import { uploadImageFile, importImageUrl, readPastedImages, hasPastedImages } from "@/lib/upload/client";
import { useSquareEditor, isSquareFile, editedFile } from "@/components/admin/square-image-editor";
import { IMG_PROXY, siteImageUrl } from "@/lib/image-loader";

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

/**
 * Field gambar: upload file, atau klik kolom lalu Ctrl+V — gambar dari clipboard
 * ("Salin gambar") maupun alamat gambar langsung diunggah ke CDN.
 */
export function ImageInput({
  value,
  onChange,
  placeholder = "Tempel gambar (Ctrl+V) atau upload",
  wide = false,
  square = false,
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  wide?: boolean; // foto full-width beranda: disimpan s/d 2400px (bukan 1200px)
  /** Foto produk/varian: foto non-persegi dibuka di editor 1:1 + tombol edit untuk foto terpasang. */
  square?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { edit, editor } = useSquareEditor();

  // square: file non-persegi → editor 1:1 dulu (Batal = tak diunggah).
  async function uploadFile(file: File): Promise<string> {
    if (square && !(await isSquareFile(file))) {
      const r = await edit(file, { allowSkip: true });
      if (r === null) throw new Error("");
      if (r !== "asli") return uploadImageFile(editedFile(r, file.name), { wide });
    }
    return uploadImageFile(file, { wide });
  }

  async function run(task: () => Promise<string>) {
    setUploading(true);
    setError(null);
    try {
      onChange(await task());
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload gagal";
      setError(msg || null); // pesan kosong = dibatalkan di editor
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void run(() => uploadFile(file));
  }

  // Ctrl+V di kolom: gambar dari clipboard / alamat gambar → unggah ke CDN.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const p = readPastedImages(e.clipboardData);
    if (!hasPastedImages(p)) return;
    e.preventDefault();
    void run(() => (p.files[0] ? uploadFile(p.files[0]) : importImageUrl(p.urls[0], { wide })));
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          disabled={uploading}
          placeholder={uploading ? "Mengunggah…" : placeholder}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </button>
        {square && value && (
          <button
            type="button"
            disabled={uploading}
            onClick={() =>
              void run(async () => {
                const r = await edit(siteImageUrl(value, undefined, IMG_PROXY));
                if (!r || r === "asli") return value;
                return uploadImageFile(editedFile(r), { wide });
              })
            }
            className="inline-flex shrink-0 items-center rounded-md border border-border px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="Edit foto (1:1)"
            title="Edit foto: perbesar/perkecil, geser, putar"
          >
            <Pencil className="size-4" />
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      {editor}
    </div>
  );
}
