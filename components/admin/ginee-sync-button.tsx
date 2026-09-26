"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncGineeStock } from "@/lib/actions/ginee";

export function GineeSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    const res = await syncGineeStock();
    setBusy(false);
    if (!res.ok) {
      setMsg(res.errors[0] ?? "Gagal sinkron.");
      return;
    }
    setMsg(`Sinkron selesai dari ${res.productsChecked} produk: stok ${res.stockUpdated} varian, harga ${res.priceUpdated} varian diperbarui${res.archived ? `, ${res.archived} produk diarsipkan (dihapus di Ginee)` : ""}${res.restored ? `, ${res.restored} dipulihkan` : ""}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        Sinkron Stok & Harga dari Ginee
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
