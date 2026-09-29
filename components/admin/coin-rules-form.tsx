"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveCoinRules } from "@/lib/actions/coins";
import { DEFAULT_COIN_RULES, promoWindow, type CoinPromo, type CoinRules } from "@/lib/coins-rules";
import { fmtWibDate } from "@/lib/campaigns";

type NumKey = Exclude<keyof CoinRules, "enabled" | "promos">;

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
    const badPromo = v.promos.find((pr) => !pr.label.trim() || !Number.isFinite(pr.percent) || (pr.kind === "custom" && (!pr.start || !pr.end)));
    if (badPromo) return setMsg({ ok: false, text: "Lengkapi promo cashback: nama, persen, dan tanggal (untuk rentang sendiri)." });
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

      <PromoEditor promos={v.promos} base={v.cashbackPercent} onChange={(promos) => setV({ ...v, promos })} />

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

const KIND_LABEL: Record<CoinPromo["kind"], string> = {
  "payday-sale": "Setiap Payday (tgl 25–28)",
  "tanggal-kembar": "Setiap tanggal kembar (10.10, 11.11, …)",
  custom: "Rentang tanggal sendiri",
};

/** Promo cashback berjadwal: persen lebih tinggi otomatis selama jadwal berjalan. */
function PromoEditor({ promos, base, onChange }: { promos: CoinPromo[]; base: number; onChange: (p: CoinPromo[]) => void }) {
  const set = (i: number, patch: Partial<CoinPromo>) => onChange(promos.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const add = (kind: CoinPromo["kind"]) =>
    onChange([
      ...promos,
      {
        id: Math.random().toString(36).slice(2, 10),
        label: kind === "payday-sale" ? "Payday Sale" : kind === "tanggal-kembar" ? "Tanggal Kembar" : "Promo Spesial",
        percent: Math.max(5, Number.isFinite(base) ? base + 3 : 5),
        kind,
        start: "",
        end: "",
        active: true,
      },
    ]);
  const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  return (
    <div className="mt-6 border-t border-border pt-4">
      <p className="text-sm font-medium">Promo cashback berjadwal</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Selama jadwal berjalan, cashback memakai persen promo (bila lebih tinggi dari {Number.isFinite(base) ? base : "—"}%). Persen dikunci
        saat pesanan dibuat, jadi tetap berlaku walau pesanan selesai setelah promo berakhir. PDP & checkout menampilkan label promonya.
      </p>

      <div className="mt-3 space-y-3">
        {promos.map((p, i) => {
          const w = promoWindow(p);
          const status = !p.active
            ? { text: "Nonaktif", cls: "bg-muted text-muted-foreground" }
            : !w
              ? { text: p.kind === "custom" && (!p.start || !p.end) ? "Isi tanggal" : "Sudah lewat", cls: "bg-muted text-muted-foreground" }
              : w.live
                ? { text: `Berjalan s/d ${fmtWibDate(new Date(w.end.getTime() - 1))}`, cls: "bg-emerald-100 text-emerald-800" }
                : { text: `Mulai ${fmtWibDate(w.start)}`, cls: "bg-amber-100 text-amber-800" };
          return (
            <div key={p.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium">{KIND_LABEL[p.kind]}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.cls}`}>{status.text}</span>
                <label className="ml-auto flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={p.active} onChange={(e) => set(i, { active: e.target.checked })} className="accent-foreground" /> Aktif
                </label>
                <button type="button" onClick={() => onChange(promos.filter((_, j) => j !== i))} className="text-xs text-muted-foreground hover:text-destructive">
                  Hapus
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_120px]">
                <input value={p.label} maxLength={40} onChange={(e) => set(i, { label: e.target.value })} placeholder="Nama promo (tampil ke pembeli)" className={input} />
                <span className="flex items-center rounded-md border border-border bg-background focus-within:border-foreground">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.1}
                    value={Number.isFinite(p.percent) ? p.percent : ""}
                    onChange={(e) => set(i, { percent: e.target.value === "" ? NaN : Number(e.target.value) })}
                    className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                    aria-label="Persen cashback promo"
                  />
                  <span className="pr-3 text-xs text-muted-foreground">%</span>
                </span>
              </div>
              {p.kind === "custom" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-muted-foreground">
                    Mulai (WIB)
                    <input type="date" value={p.start ?? ""} onChange={(e) => set(i, { start: e.target.value })} className={`${input} mt-0.5`} />
                  </label>
                  <label className="text-[11px] text-muted-foreground">
                    Selesai (sampai 23:59 WIB)
                    <input type="date" value={p.end ?? ""} onChange={(e) => set(i, { end: e.target.value })} className={`${input} mt-0.5`} />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {promos.length < 10 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["payday-sale", "tanggal-kembar", "custom"] as const).map((k) => (
            <button key={k} type="button" onClick={() => add(k)} className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-foreground">
              + {KIND_LABEL[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
