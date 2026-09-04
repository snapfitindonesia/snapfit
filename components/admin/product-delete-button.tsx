"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProduct } from "@/lib/actions/admin";

export function ProductDeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm(`Hapus produk "${name}"? Tindakan ini tak bisa dibatalkan.`)) return;
    setBusy(true);
    const res = await deleteProduct(id);
    if (res.ok) router.refresh();
    else {
      alert(res.error ?? "Gagal menghapus.");
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
      aria-label={`Hapus ${name}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
