"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ukuran hasil (px). Sama dengan batas foto produk di CDN (lib/upload/cdn.ts → 1200px). */
const OUT = 1200;
/** Ukuran bingkai pratinjau di layar (px). */
const FRAME = 320;

type Props = {
  /** File baru atau URL foto (foto CDN lewat /img/… agar satu domain → canvas boleh diekspor). */
  source: File | string;
  /** Judul kecil, mis. "Foto 2 dari 3". */
  label?: string;
  onDone: (blob: Blob) => void | Promise<void>;
  /** Pakai foto asli tanpa diubah (hanya untuk file baru). */
  onSkip?: () => void;
  onCancel: () => void;
};

/**
 * Editor foto persegi (1:1) untuk foto produk & varian: perbesar/perkecil, geser, putar.
 * "Muat semua" memperkecil foto potret/lanskap sampai seluruh produk masuk kotak; sisi kosong diisi PUTIH.
 * Hasil: WebP 1200×1200 (dibuat di browser, lalu diunggah lewat alur upload biasa).
 */
export function SquareImageEditor({ source, label, onDone, onSkip, onCancel }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scale, setScale] = useState(1); // px layar per px foto
  const [pos, setPos] = useState({ x: 0, y: 0 }); // geser (px layar) dari tengah
  const [rot, setRot] = useState(0); // 0/90/180/270
  const [saving, setSaving] = useState(false);
  const drag = useRef<{ sx: number; sy: number; x: number; y: number } | null>(null);

  // Muat foto (File → object URL; URL → apa adanya).
  useEffect(() => {
    let url: string | null = null;
    let active = true; // muatan yang sudah dibatalkan (ganti foto / StrictMode) diabaikan
    const el = new Image();
    el.decoding = "async";
    el.onload = () => { if (active) { setLoadError(null); setImg(el); } };
    el.onerror = () => { if (active) setLoadError("Foto tidak bisa dibuka di editor."); };
    if (typeof source === "string") {
      el.crossOrigin = "anonymous";
      el.src = source;
    } else {
      url = URL.createObjectURL(source);
      el.src = url;
    }
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [source]);

  const dims = useCallback(() => {
    if (!img) return { w: 1, h: 1 };
    const turned = rot % 180 !== 0;
    return { w: turned ? img.naturalHeight : img.naturalWidth, h: turned ? img.naturalWidth : img.naturalHeight };
  }, [img, rot]);
  const fitScale = useCallback(() => { const { w, h } = dims(); return FRAME / Math.max(w, h); }, [dims]);
  const coverScale = useCallback(() => { const { w, h } = dims(); return FRAME / Math.min(w, h); }, [dims]);

  // Awal: "muat semua" (foto potret → utuh dengan sisi putih).
  useEffect(() => {
    if (img) { setScale(fitScale()); setPos({ x: 0, y: 0 }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat foto baru dimuat
  }, [img]);

  // Geser dibatasi: sisi yang lebih besar dari kotak tak boleh memperlihatkan ruang kosong; yang lebih kecil tetap di tengah.
  const clamp = useCallback(
    (p: { x: number; y: number }, s = scale) => {
      const { w, h } = dims();
      const mx = Math.max(0, (w * s - FRAME) / 2);
      const my = Math.max(0, (h * s - FRAME) / 2);
      return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
    },
    [dims, scale],
  );

  const minS = fitScale() * 0.6;
  const maxS = coverScale() * 3;
  const pct = Math.round((scale / fitScale()) * 100); // 100% = pas, seluruh foto terlihat
  const setZoom = (s: number) => {
    const next = Math.min(maxS, Math.max(minS, s));
    setScale(next);
    setPos((p) => clamp(p, next));
  };

  const { w, h } = dims();
  const shownW = w * scale;
  const shownH = h * scale;
  const status =
    shownW <= FRAME + 0.5 && shownH <= FRAME + 0.5
      ? shownW < FRAME - 0.5 || shownH < FRAME - 0.5
        ? "Seluruh produk terlihat; sisi kosong diisi putih."
        : "Pas penuh tanpa terpotong."
      : "Tepi foto ada yang terpotong.";

  // Keyboard: Esc batal, +/- zoom.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "+" || e.key === "=") setZoom(scale * 1.1);
      if (e.key === "-") setZoom(scale / 1.1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function save() {
    if (!img) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, OUT, OUT);
      const k = OUT / FRAME;
      ctx.imageSmoothingQuality = "high";
      ctx.translate(OUT / 2 + pos.x * k, OUT / 2 + pos.y * k);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(scale * k, scale * k);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.92));
      if (!blob) throw new Error("Gagal membuat foto.");
      await onDone(blob);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal menyimpan foto.");
      setSaving(false);
    }
  }

  const btn =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm hover:bg-muted disabled:opacity-40";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit foto 1:1"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onPointerDown={(e) => { if (e.target === e.currentTarget && !saving) onCancel(); }}
    >
      <div className="w-full max-w-[720px] rounded-xl bg-background p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Edit foto (1:1)</h2>
            {label && <p className="text-xs text-muted-foreground">{label}</p>}
          </div>
          <button type="button" onClick={onCancel} disabled={saving} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Tutup">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row">
          {/* Bingkai 1:1 — latar putih = warna isian hasil */}
          <div
            className={cn("relative shrink-0 touch-none select-none overflow-hidden rounded-md border border-border bg-white", img ? "cursor-grab active:cursor-grabbing" : "")}
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={(e) => {
              if (!img) return;
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { sx: e.clientX, sy: e.clientY, x: pos.x, y: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPos(clamp({ x: d.x + e.clientX - d.sx, y: d.y + e.clientY - d.sy }));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onWheel={(e) => setZoom(scale * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={img.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${rot}deg) scale(${scale})`,
                }}
              />
            ) : (
              <div className="grid size-full place-items-center text-sm text-muted-foreground">
                {loadError ?? <Loader2 className="size-6 animate-spin" />}
              </div>
            )}
            {/* Garis bantu sepertiga */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.07) 1px, transparent 1px)",
                backgroundSize: `${FRAME / 3}px ${FRAME / 3}px`,
              }}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-sm font-medium">Ukuran</p>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" className={btn} onClick={() => setZoom(scale / 1.1)} disabled={!img} aria-label="Perkecil">
                <ZoomOut className="size-4" />
              </button>
              <input
                type="range"
                min={Math.round((minS / fitScale()) * 100)}
                max={Math.round((maxS / fitScale()) * 100)}
                step={1}
                value={pct}
                onChange={(e) => setZoom((Number(e.target.value) / 100) * fitScale())}
                disabled={!img}
                aria-label="Perbesar atau perkecil"
                className="min-w-0 flex-1 accent-foreground"
              />
              <button type="button" className={btn} onClick={() => setZoom(scale * 1.1)} disabled={!img} aria-label="Perbesar">
                <ZoomIn className="size-4" />
              </button>
              <span className="w-12 text-right text-sm tabular-nums">{pct}%</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className={btn} disabled={!img} onClick={() => { setScale(fitScale()); setPos({ x: 0, y: 0 }); }}>
                <Minimize2 className="size-4" /> Muat semua (latar putih)
              </button>
              <button type="button" className={btn} disabled={!img} onClick={() => { setScale(coverScale()); setPos({ x: 0, y: 0 }); }}>
                <Maximize2 className="size-4" /> Penuhi kotak
              </button>
              <button
                type="button"
                className={btn}
                disabled={!img}
                aria-label="Putar 90 derajat"
                onClick={() => { setRot((r) => (r + 90) % 360); setPos({ x: 0, y: 0 }); }}
              >
                <RotateCw className="size-4" />
              </button>
              <button type="button" className={btn} disabled={!img} onClick={() => { setRot(0); setPos({ x: 0, y: 0 }); if (img) setScale(FRAME / Math.max(img.naturalWidth, img.naturalHeight)); }}>
                Reset
              </button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              {img ? status : " "} Seret foto untuk menggeser · scroll / tombol − + untuk ukuran.
            </p>
            {img && (
              <p className="mt-1 text-xs text-muted-foreground">
                Asli {img.naturalWidth}×{img.naturalHeight}px → disimpan {OUT}×{OUT}px.
              </p>
            )}
            {loadError && img && <p className="mt-2 text-xs text-destructive">{loadError}</p>}

            <div className="mt-auto flex flex-wrap justify-end gap-2 pt-5">
              {onSkip && (
                <button type="button" className={btn} onClick={onSkip} disabled={saving}>
                  Pakai foto asli
                </button>
              )}
              <button type="button" className={btn} onClick={onCancel} disabled={saving}>
                Batal
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!img || saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-4 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-40"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Simpan foto
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** True bila foto sudah (hampir) persegi — tak perlu dibuka di editor saat upload. */
export async function isSquareFile(file: File): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(file);
    const r = bmp.width / bmp.height;
    bmp.close();
    return Math.abs(r - 1) < 0.02;
  } catch {
    return true; // tak bisa dibaca → biarkan alur upload biasa yang menangani
  }
}

type Job = { source: File | string; label?: string; allowSkip: boolean; resolve: (r: Blob | "asli" | null) => void };

/**
 * Antrean editor: `edit(sumber)` membuka editor dan menunggu pilihan admin →
 * Blob (hasil edit) · "asli" (pakai foto asli) · null (batal). Render `editor` di komponen pemanggil.
 */
export function useSquareEditor() {
  const [job, setJob] = useState<Job | null>(null);
  const edit = useCallback(
    (source: File | string, opts: { label?: string; allowSkip?: boolean } = {}) =>
      new Promise<Blob | "asli" | null>((resolve) => setJob({ source, label: opts.label, allowSkip: opts.allowSkip ?? false, resolve })),
    [],
  );
  const finish = (r: Blob | "asli" | null) => {
    job?.resolve(r);
    setJob(null);
  };
  const editor = job ? (
    <SquareImageEditor
      key={typeof job.source === "string" ? job.source : `${job.source.name}-${job.source.size}-${job.source.lastModified}`}
      source={job.source}
      label={job.label}
      onDone={(b) => finish(b)}
      onSkip={job.allowSkip ? () => finish("asli") : undefined}
      onCancel={() => finish(null)}
    />
  ) : null;
  return { edit, editor };
}

/** Hasil editor (Blob) → File untuk alur upload biasa. */
export const editedFile = (blob: Blob, name = "foto") =>
  new File([blob], `${name.replace(/\.[^.]+$/, "")}-1x1.webp`, { type: "image/webp" });
