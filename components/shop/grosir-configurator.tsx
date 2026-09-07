"use client";

import { useState } from "react";
import { ArrowRight, Minus, Plus, MessageCircle, Gift, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";

export function GrosirConfigurator({
  brands,
  series,
  waNumber,
  minOrder,
  pricePerPcs,
}: {
  brands: string[];
  series: string[];
  waNumber: string;
  minOrder: number;
  pricePerPcs: number;
}) {
  const [brand, setBrand] = useState<string | null>(null);
  const [dev, setDev] = useState<string | null>(null);
  const [qty, setQty] = useState(minOrder);

  const ready = Boolean(brand && dev);
  const estimasi = qty * pricePerPcs;
  const text = encodeURIComponent(
    `Halo SnapFit, saya mau order PAKET GROSIR case:\n• Merek: ${brand}\n• Tipe HP: ${dev}\n• Jumlah: ${qty} pcs\nMohon info harga grosirnya. 🙏`,
  );
  const href = ready && waNumber ? `https://wa.me/${waNumber}?text=${text}` : ready ? "/produk" : "#";

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-background shadow-sm">
      {/* Step 1 — Merek */}
      <div className="p-6 sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-brand-foreground">1</span>
          Pilih Merek Favoritmu
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
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

        {/* Step 2 — Tipe HP */}
        <p className="mt-7 flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-brand-foreground">2</span>
          Untuk Tipe HP
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
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

        {/* Step 3 — Jumlah */}
        <p className="mt-7 flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-full bg-brand text-xs text-brand-foreground">3</span>
          Jumlah <span className="font-normal text-muted-foreground">(min. {minOrder} pcs)</span>
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-border">
            <button type="button" aria-label="Kurangi" className="grid size-11 place-items-center disabled:opacity-40" disabled={qty <= minOrder} onClick={() => setQty((q) => Math.max(minOrder, q - 5))}>
              <Minus className="size-4" />
            </button>
            <span className="w-14 text-center text-base font-semibold tabular-nums">{qty}</span>
            <button type="button" aria-label="Tambah" className="grid size-11 place-items-center" onClick={() => setQty((q) => q + 5)}>
              <Plus className="size-4" />
            </button>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Estimasi mulai </span>
            <span className="font-bold text-brand">{formatRupiah(estimasi)}</span>
          </div>
        </div>
      </div>

      {/* Surprise pack framing */}
      <div className="flex items-start gap-3 border-t border-border bg-brand/5 px-6 py-4 sm:px-8">
        <Gift className="mt-0.5 size-5 shrink-0 text-brand" />
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Paket kejutan grosir 🎁</strong> — merek & tipe HP{" "}
          <strong className="text-foreground">pasti sesuai pilihanmu</strong>, model case-nya (bumper,
          clear, rugged, dll) kami pilihkan yang terbaik & paling laris. Semua original bergaransi.
        </p>
      </div>

      {/* CTA */}
      <div className="border-t border-border p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-muted-foreground">Pesananmu:</span>
          <span className={cn("font-medium", !brand && "text-muted-foreground/50")}>{brand ?? "— merek —"}</span>
          <span className="text-muted-foreground">·</span>
          <span className={cn("font-medium", !dev && "text-muted-foreground/50")}>{dev ?? "— tipe HP —"}</span>
          <span className="text-muted-foreground">·</span>
          <span className="font-medium">{qty} pcs</span>
        </div>
        {ready ? (
          <a
            href={href}
            target={waNumber ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 py-4 text-base font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="size-5" /> Pesan Paket Grosir via WhatsApp
            <ArrowRight className="size-5" />
          </a>
        ) : (
          <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-muted px-5 py-4 text-base font-semibold text-muted-foreground">
            <Check className="size-5" /> Pilih merek & tipe HP dulu
          </div>
        )}
      </div>
    </div>
  );
}
