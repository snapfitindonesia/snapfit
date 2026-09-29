"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminAdjustCoins } from "@/lib/actions/coins";

export function CoinAdjustForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await adminAdjustCoins({ email, amount: Number(amount), note });
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Tersimpan." });
      setAmount("");
      setNote("");
      router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Gagal." });
  }

  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-border p-4">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email akun pembeli" className={input} />
      <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Jumlah koin (mis. 5000 atau -2000)" className={input} />
      <input required value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Alasan (mis. Kompensasi paket terlambat)" className={input} />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}Simpan
        </Button>
        {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{msg.text}</span>}
      </div>
    </form>
  );
}
