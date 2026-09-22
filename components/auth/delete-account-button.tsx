"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteMyAccount } from "@/lib/actions/auth";
import { useStoreUI } from "@/components/shop/store-ui-provider";

export function DeleteAccountButton() {
  const router = useRouter();
  const { refreshAuth, notify } = useStoreUI();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    const yes = window.confirm(
      "Hapus akun secara permanen? Kamu tidak bisa login lagi dengan akun ini. Tindakan ini tidak bisa dibatalkan.",
    );
    if (!yes) return;
    setBusy(true);
    setError(null);
    const res = await deleteMyAccount();
    if (res.ok) {
      refreshAuth();
      notify("Akun dihapus");
      router.push("/");
      router.refresh();
    } else {
      setError(res.error ?? "Gagal menghapus akun.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onDelete}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive hover:text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        Hapus akun permanen
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
