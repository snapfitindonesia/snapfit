"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCoinRules } from "@/lib/actions/coins";
import { DEFAULT_COIN_RULES, type CoinRules } from "@/lib/coins-rules";

type NumKey = Exclude<keyof CoinRules, "enabled">;

const FIELDS: { key: NumKey; label: string; hint: string; suffix: string; step?: number }[] = [
  { key: "cashbackPercent", label: "Cashback", hint: "Dari nilai belanja dibayar (tanpa ongkir), masuk saat pesanan Selesai.", suffix: "%", step: 0.1 },
  { key: "signupBonus", label: "Bonus member baru", hint: "Sekali per akun. 0 = tanpa bonus.", suffix: "koin" },
  { key: "reviewBonus", label: "Bonus ulasan", hint: "Per ulasan pembeli yang Anda setujui.", suffix: "koin" },
  { key: "maxUsePercent", label: "Pakai maksimal", hint: "Dari subtotal belanja. Koin tak pernah memotong ongkir.", suffix: "%", step: 1 },
  { key: "minUse", label: "Saldo minimal untuk dipakai", hint: "Di bawah ini koin belum bisa dipakai.", suffix: "koin" },
  { key: "expireDays", label: "Masa berlaku", hint: "Per perolehan (180 = 6 bulan). Berlaku untuk koin yang diterima setelah disimpan.", suffix: "hari" },
  { key: "expireNoticeDays", label: "Email pengingat hangus", hint: "Dikirim x hari sebelum hangus. 0 = tanpa email.", suffix: "hari" },
  { key: "autoDoneDays", label: "Cashback otomatis", hint: "Bila pesanan tak ditandai Selesai, cashback masuk x hari setelah Dikirim.", suffix: "hari" },
];

export function CoinRulesForm({ rules }: { rules: CoinRules }) {
  const router = useRouter();
  const [v, setV] = useState<CoinRules>(rules);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dirty = JSON.stringify(v) !== JSON.stringify(rules);

  async function save() {
    const empty = FIELDS.find((f) => !Number.isFinite(v[f.key]));
    if (empty) return setMsg({ ok: false, text: `"${empty.label}" wajib diisi.` });
    setBusy(true);
    setMsg(null);
    const res = await saveCoinRules(v);
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Tersimpan — berlaku untuk transaksi berikutnya." });
      router.refresh();
    } else setMsg({ ok: false, text: res.error ?? "Gagal menyimpan." });
  }

  return (
    <div className="mt-3 rounded-lg border border-border p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={v.enabled}
          onChange={(e) => setV({ ...v, enabled: e.target.checked })}
          className="mt-0.5 size-4 accent-foreground"
        />
        <span>
          <span className="block text-sm font-medium">Program koin aktif</span>
          <span className="block text-xs text-muted-foreground">
            Dimatikan: tidak ada cashback & bonus baru, info koin di PDP/checkout disembunyikan. Saldo yang sudah dimiliki
            member tetap bisa dipakai.
          </span>
        </span>
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs font-medium">{f.label}</span>
            <span className="mt-1 flex items-center rounded-md border border-border bg-background focus-within:border-foreground">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={f.step ?? 1}
                value={Number.isFinite(v[f.key]) ? v[f.key] : ""}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value === "" ? NaN : Number(e.target.value) })}
                className="w-full bg-transparent px-3 py-2 text-sm outline-none"
              />
              <span className="shrink-0 pr-3 text-xs text-muted-foreground">{f.suffix}</span>
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{f.hint}</span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={busy || !dirty}>
          {busy && <Loader2 className="size-4 animate-spin" />}Simpan aturan
        </Button>
        <button
          type="button"
          onClick={() => setV(DEFAULT_COIN_RULES)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          Kembalikan ke default
        </button>
        {msg && <span className={msg.ok ? "text-xs text-emerald-700" : "text-xs text-destructive"}>{msg.text}</span>}
      </div>
    </div>
  );
}
