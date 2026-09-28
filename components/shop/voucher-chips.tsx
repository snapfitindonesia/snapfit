"use client";

import { useState } from "react";
import { Check, Copy, Ticket } from "lucide-react";
import { formatRupiah } from "@/lib/format";

export type VoucherChipData = { code: string; label: string; minPurchase: number };

/** Kode voucher aktif yang bisa disalin (dipakai di checkout). */
export function VoucherChips({ vouchers }: { vouchers: VoucherChipData[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!vouchers.length) return null;

  function copy(code: string) {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {vouchers.map((v) => (
        <li key={v.code} className="flex items-center gap-3 rounded-xl border border-dashed border-brand/50 bg-brand/5 p-3">
          <Ticket className="size-5 shrink-0 text-brand-ink" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{v.label}</p>
            <p className="text-xs text-foreground/70">
              Kode <span className="font-mono font-semibold text-foreground">{v.code}</span>
              {v.minPurchase > 0 && ` · min. belanja ${formatRupiah(v.minPurchase)}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => copy(v.code)}
            aria-label={`Salin kode ${v.code}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:border-foreground"
          >
            {copied === v.code ? <><Check className="size-3.5" /> Tersalin</> : <><Copy className="size-3.5" /> Salin</>}
          </button>
        </li>
      ))}
    </ul>
  );
}
