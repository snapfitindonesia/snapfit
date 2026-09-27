"use client";

import { useState } from "react";
import { Camera, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/upload/client";

const LABELS = ["", "Buruk", "Kurang", "Cukup", "Bagus", "Sangat bagus"];

/** Form ulasan 1 produk (halaman /ulasan/[token]) → POST /api/ulasan. */
export function ReviewForm({
  token,
  productId,
  productName,
  defaultName,
}: {
  token: string;
  productId: string;
  productName: string;
  defaultName: string;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState(defaultName);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function pickPhoto(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rating) return setError("Pilih jumlah bintang dulu.");
    if (comment.trim().length < 5) return setError("Tulis ulasan minimal 5 karakter.");
    if (!author.trim()) return setError("Isi nama yang ditampilkan.");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("productId", productId);
      form.append("rating", String(rating));
      form.append("comment", comment);
      form.append("author", author);
      if (photo) form.append("photo", await shrinkImage(photo), "foto.webp");
      const res = await fetch("/api/ulasan", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Gagal mengirim ulasan.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim ulasan.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p role="status" className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        ✓ Terima kasih! Ulasanmu akan tampil setelah kami periksa.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset>
        <legend className="text-sm font-medium">Penilaian</legend>
        <div className="mt-1.5 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} bintang`}
              aria-pressed={rating === n}
              className="grid size-10 place-items-center rounded-md hover:bg-muted"
            >
              <Star className={`size-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"}`} />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">{LABELS[rating]}</span>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Ulasan</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder={`Ceritakan pengalamanmu dengan ${productName.split(" ").slice(0, 4).join(" ")}…`}
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nama yang ditampilkan</span>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={40}
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
        </label>
        <div>
          <span className="text-sm font-medium">Foto (opsional)</span>
          {preview ? (
            <div className="relative mt-1.5 size-20 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Pratinjau foto" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => pickPhoto(null)}
                aria-label="Hapus foto"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-foreground/80 text-background"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:border-foreground">
              <Camera className="size-4" /> Tambah foto produk
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy && <Loader2 className="size-4 animate-spin" />} Kirim ulasan
      </Button>
    </form>
  );
}
