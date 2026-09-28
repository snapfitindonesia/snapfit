"use client";

import Link from "next/link";
import { Check, Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { canCombine, computeVoucherBenefit } from "@/lib/voucher";

export type PickerVoucher = { code: string; type: string; amount: number; minPurchase: number; maxBenefit: number; stackable: boolean; label: string };
type AppliedLite = { code: string; type: string; stackable: boolean };

type Row = PickerVoucher & { state: "ok" | "short" | "none"; saving: number; shortfall: number };

/**
 * Daftar voucher aktif di ringkasan checkout. Syarat & nilai hemat dihitung dengan
 * computeVoucherBenefit (sama dengan server saat pesanan dibuat). Belum memenuhi
 * syarat → "Belanja RpX lagi" + progres + ajakan tambah produk. Voucher yang tak bisa
 * digabung dengan yang sedang terpakai → tombol "Ganti" + keterangan.
 */
export function VoucherPicker({
  vouchers,
  subtotal,
  shippingCost,
  applied,
  applyingCode,
  onApply,
}: {
  vouchers: PickerVoucher[];
  subtotal: number;
  shippingCost: number; // ongkir SEBELUM voucher
  applied: AppliedLite[];
  applyingCode: string | null;
  onApply: (code: string) => void;
}) {
  if (!vouchers.length) return null;

  const rows: Row[] = vouchers.map((v) => {
    const b = computeVoucherBenefit({ ...v, active: true }, subtotal, shippingCost);
    if (b.valid) return { ...v, state: b.discount > 0 ? "ok" : "none", saving: b.discount, shortfall: 0 };
    return { ...v, state: "short", saving: 0, shortfall: Math.max(0, v.minPurchase - subtotal) };
  });
  const rank = { ok: 0, short: 1, none: 2 } as const;
  rows.sort((a, b) => rank[a.state] - rank[b.state] || b.saving - a.saving || a.shortfall - b.shortfall);
  // "Paling hemat" per jenis (potongan & gratis ongkir dipilih terpisah).
  const best = new Set(["POTONGAN", "GRATIS_ONGKIR"].map((t) => rows.find((r) => r.state === "ok" && r.type === t)?.code));

  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Voucher tersedia</p>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => {
          const isApplied = applied.some((a) => a.code === r.code);
          const conflicts = isApplied ? [] : applied.filter((a) => !canCombine(a, r));
          return (
            <li
              key={r.code}
              className={cn(
                "rounded-lg border p-3 text-sm",
                isApplied ? "border-emerald-600 bg-emerald-50/60" : r.state === "ok" ? "border-brand/40 bg-brand/5" : "border-border",
              )}
            >
              <div className="flex items-start gap-2">
                <Ticket className={cn("mt-0.5 size-4 shrink-0", r.state === "ok" || isApplied ? "text-brand-ink" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-xs text-foreground/70">
                    <span className="font-mono">{r.code}</span>
                    {r.minPurchase > 0 && ` · min. belanja ${formatRupiah(r.minPurchase)}`}
                  </p>
                  {r.stackable && (
                    <p className="mt-1 text-[11px] text-foreground/70">
                      Bisa digabung dengan voucher {r.type === "GRATIS_ONGKIR" ? "potongan" : "gratis ongkir"}
                    </p>
                  )}
                  {r.state === "ok" && (
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-medium text-emerald-700">
                      Hemat {formatRupiah(r.saving)}
                      {best.has(r.code) && !isApplied && (
                        <span className="whitespace-nowrap rounded bg-brand-ink px-1.5 py-0.5 text-[10px] font-semibold text-brand-foreground">
                          Paling hemat
                        </span>
                      )}
                    </p>
                  )}
                  {r.state === "none" && (
                    <p className="mt-0.5 text-xs text-foreground/70">
                      {r.type === "GRATIS_ONGKIR" ? "Ongkirmu sudah gratis 🎉" : "Belum memberi potongan untuk pesanan ini."}
                    </p>
                  )}
                  {r.state === "ok" && conflicts.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-foreground/70">
                      Tidak bisa digabung dengan {conflicts.map((c) => c.code).join(", ")} — pakai ini akan menggantinya.
                    </p>
                  )}
                </div>
                {isApplied ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700">
                    <Check className="size-3.5" /> Terpakai
                  </span>
                ) : r.state === "ok" ? (
                  <button
                    type="button"
                    onClick={() => onApply(r.code)}
                    disabled={applyingCode !== null}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-60"
                  >
                    {applyingCode === r.code && <Loader2 className="size-3.5 animate-spin" />}
                    {conflicts.length ? "Ganti" : "Pakai"}
                  </button>
                ) : null}
              </div>

              {r.state === "short" && (
                <div className="mt-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (subtotal / r.minPurchase) * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs">
                    Belanja <b>{formatRupiah(r.shortfall)}</b> lagi untuk pakai voucher ini.
                  </p>
                  <Link href="/produk" className="mt-1 inline-block text-xs font-medium text-brand-ink underline underline-offset-2">
                    Tambah produk →
                  </Link>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
