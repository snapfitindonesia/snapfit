"use client";

import { useState } from "react";
import { ArrowRight, Check, Minus, Plus, MessageCircle, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GrosirConfigurator({
  brands,
  series,
  waNumber,
  minOrder,
}: {
  brands: string[];
  series: string[];
  waNumber: string;
  minOrder: number;
}) {
  const [brand, setBrand] = useState<string | null>(null);
  const [dev, setDev] = useState<string | null>(null);
  const [qty, setQty] = useState(minOrder);

  const ready = Boolean(brand && dev);
  const text = ready
    ? encodeURIComponent(
        `Halo SnapFit, saya mau order GROSIR case:\n• Merek: ${brand}\n• Tipe HP: ${dev}\n• Jumlah: ${qty} pcs\nMohon info harga grosirnya. 🙏`,
      )
    : "";
  const href = ready && waNumber ? `https://wa.me/${waNumber}?text=${text}` : "/produk";

  return (
    <div className="rounded-3xl border border-border bg-background p-6 shadow-sm sm:p-8">
      {/* Langkah 1 — Merek */}
      <div>
        <p className="text-sm font-semibold">
          <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-brand text-xs text-brand-foreground">1</span>
          Pilih Merek
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {brands.map((b) => {
            const on = brand === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBrand(b)}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-2 py-2.5 text-center text-xs font-semibold tracking-tight transition-colors",
                  on ? "border-brand bg-brand/5 text-brand ring-1 ring-brand" : "border-border hover:border-foreground",
                )}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* Langkah 2 — Tipe HP */}
      <div className="mt-6">
        <p className="text-sm font-semibold">
          <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-brand text-xs text-brand-foreground">2</span>
          Pilih Tipe HP
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {series.map((s) => {
            const on = dev === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setDev(s)}
                aria-pressed={on}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm transition-colors",
                  on ? "border-brand bg-brand/5 font-medium text-brand ring-1 ring-brand" : "border-border hover:border-foreground",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Langkah 3 — Jumlah */}
      <div className="mt-6">
        <p className="text-sm font-semibold">
          <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-brand text-xs text-brand-foreground">3</span>
          Jumlah (min. {minOrder} pcs)
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              aria-label="Kurangi"
              className="grid size-10 place-items-center disabled:opacity-40"
              disabled={qty <= minOrder}
              onClick={() => setQty((q) => Math.max(minOrder, q - 5))}
            >
              <Minus className="size-4" />
            </button>
            <span className="w-14 text-center text-sm font-medium tabular-nums">{qty}</span>
            <button
              type="button"
              aria-label="Tambah"
              className="grid size-10 place-items-center"
              onClick={() => setQty((q) => q + 5)}
            >
              <Plus className="size-4" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">pcs</span>
        </div>
      </div>

      {/* Info model acak */}
      <div className="mt-6 flex gap-3 rounded-xl bg-muted/60 p-4">
        <Shuffle className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Model campur (assorted).</strong> Merek & tipe HP sesuai
          pilihanmu — model case-nya (bumper, clear, rugged, dll) kami pilihkan yang terbaik &
          paling laris sesuai stok. Kualitas dijamin original.
        </p>
      </div>

      {/* Ringkasan + CTA */}
      <div className="mt-6 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Pesananmu:</span>
          <span className={cn("font-medium", !brand && "text-muted-foreground/60")}>{brand ?? "— merek —"}</span>
          <span className="text-muted-foreground">·</span>
          <span className={cn("font-medium", !dev && "text-muted-foreground/60")}>{dev ?? "— tipe HP —"}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{qty} pcs</span>
        </div>
        <Button
          size="lg"
          className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
          disabled={!ready}
          asChild={ready}
        >
          {ready ? (
            <a href={href} target={waNumber ? "_blank" : undefined} rel="noopener noreferrer">
              {waNumber ? <MessageCircle className="size-4" /> : null}
              {ready ? "Pesan Grosir Sekarang" : "Pesan Grosir"}
              <ArrowRight className="size-4" />
            </a>
          ) : (
            <span>
              <Check className="size-4" /> Pilih merek & tipe HP dulu
            </span>
          )}
        </Button>
        {!waNumber && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            (Set nomor WA di config agar tombol langsung membuka chat pesanan.)
          </p>
        )}
      </div>
    </div>
  );
}
