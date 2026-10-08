"use client";

import { useState } from "react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { purgeAllCache } from "@/lib/actions/cache";

/** Tombol "Segarkan Semua" (purge cache) — perubahan admin langsung tampil di toko. */
export function PurgeCacheButton({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function run() {
    setState("busy");
    const res = await purgeAllCache().catch(() => ({ ok: false }));
    setState(res.ok ? "done" : "error");
    setTimeout(() => setState("idle"), 3000);
  }

  const label = state === "busy" ? "Menyegarkan…" : state === "done" ? "Tersegarkan" : state === "error" ? "Gagal, coba lagi" : "Segarkan Semua";
  const Icon = state === "busy" ? Loader2 : state === "done" ? Check : RefreshCw;

  return (
    <button
      type="button"
      onClick={run}
      disabled={state === "busy"}
      title="Hapus cache toko — perubahan admin langsung tampil di situs"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-muted disabled:opacity-70",
        compact ? "h-9 px-3" : "h-[42px] w-full justify-center px-3",
        state === "done" && "border-green-600/40 text-green-700",
        state === "error" && "border-destructive/40 text-destructive",
      )}
    >
      <Icon className={cn("size-4", state === "busy" && "animate-spin")} aria-hidden />
      {compact ? <span className="sr-only sm:not-sr-only">{label}</span> : label}
    </button>
  );
}
