"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadImageFile, importImageUrl, readPastedImages, hasPastedImages } from "@/lib/upload/client";

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
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(task: () => Promise<string>) {
    setUploading(true);
    setError(null);
    try {
      onChange(await task());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void run(() => uploadImageFile(file));
  }

  // Ctrl+V di kolom: gambar dari clipboard / alamat gambar → unggah ke CDN.
  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const p = readPastedImages(e.clipboardData);
    if (!hasPastedImages(p)) return;
    e.preventDefault();
    void run(() => (p.files[0] ? uploadImageFile(p.files[0]) : importImageUrl(p.urls[0])));
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
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
