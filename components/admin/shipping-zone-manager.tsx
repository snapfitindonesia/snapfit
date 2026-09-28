"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { saveShippingZones } from "@/lib/actions/shipping";
import { ISLAND_GROUPS, PROVINCES } from "@/lib/wilayah";

export type ZoneRow = { provinceCode: string; baseCost: string; perKg: string; etd: string; available: boolean };

const input = "w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-foreground";

/** Tabel ongkir 38 provinsi. Kosong = tarif flat. Isi cepat per pulau. */
export function ShippingZoneManager({ initial, flatCost }: { initial: ZoneRow[]; flatCost: number }) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, ZoneRow>>(() => {
    const m: Record<string, ZoneRow> = {};
    for (const p of PROVINCES) m[p.code] = initial.find((r) => r.provinceCode === p.code) ?? { provinceCode: p.code, baseCost: "", perKg: "", etd: "", available: true };
    return m;
  });
  const [bulk, setBulk] = useState({ group: ISLAND_GROUPS[0].id, baseCost: "", perKg: "", etd: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [q, setQ] = useState("");

  const dirty = useMemo(
    () => PROVINCES.some((p) => {
      const a = rows[p.code];
      const b = initial.find((r) => r.provinceCode === p.code) ?? { baseCost: "", perKg: "", etd: "", available: true };
      return a.baseCost !== b.baseCost || a.perKg !== b.perKg || a.etd !== b.etd || a.available !== b.available;
    }),
    [rows, initial],
  );
  const filled = PROVINCES.filter((p) => rows[p.code].available && rows[p.code].baseCost.trim() !== "").length;
  const closed = PROVINCES.filter((p) => !rows[p.code].available).length;

  const set = <K extends keyof ZoneRow>(code: string, k: K, v: ZoneRow[K]) => setRows((r) => ({ ...r, [code]: { ...r[code], [k]: v } }));
  const num = (v: string) => v.replace(/[^\d]/g, "");

  function applyBulk() {
    const g = ISLAND_GROUPS.find((x) => x.id === bulk.group)!;
    setRows((r) => {
      const next = { ...r };
      for (const c of g.codes) next[c] = { provinceCode: c, baseCost: bulk.baseCost, perKg: bulk.perKg, etd: bulk.etd, available: true };
      return next;
    });
    setMsg({ ok: true, text: `Diterapkan ke ${g.codes.length} provinsi ${g.label} — jangan lupa Simpan.` });
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await saveShippingZones(
      PROVINCES.map((p) => {
        const r = rows[p.code];
        return { provinceCode: p.code, baseCost: r.baseCost.trim() === "" ? null : Number(r.baseCost), perKg: Number(r.perKg || 0), etd: r.etd, available: r.available };
      }),
    );
    setSaving(false);
    setMsg(res.ok ? { ok: true, text: `Tersimpan: ${res.saved} provinsi bertarif khusus.` } : { ok: false, text: res.error ?? "Gagal menyimpan." });
    if (res.ok) router.refresh();
  }

  const kw = q.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Isi cepat per pulau</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto] sm:items-end">
          <label className="block text-xs">Pulau
            <select className={`mt-1 ${input}`} value={bulk.group} onChange={(e) => setBulk({ ...bulk, group: e.target.value })}>
              {ISLAND_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label} ({g.codes.length})</option>)}
            </select>
          </label>
          <label className="block text-xs">1 kg pertama (Rp)
            <input inputMode="numeric" className={`mt-1 ${input}`} value={bulk.baseCost} onChange={(e) => setBulk({ ...bulk, baseCost: num(e.target.value) })} placeholder="mis. 10000" />
          </label>
          <label className="block text-xs">+ per kg berikutnya
            <input inputMode="numeric" className={`mt-1 ${input}`} value={bulk.perKg} onChange={(e) => setBulk({ ...bulk, perKg: num(e.target.value) })} placeholder="mis. 10000" />
          </label>
          <label className="block text-xs">Estimasi
            <input className={`mt-1 ${input}`} value={bulk.etd} onChange={(e) => setBulk({ ...bulk, etd: e.target.value })} placeholder="mis. 2-3 hari" />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={applyBulk} disabled={!bulk.baseCost}>Terapkan</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input className={`${input} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari provinsi…" />
        <p className="text-sm text-muted-foreground">
          {filled}/{PROVINCES.length} provinsi bertarif khusus{closed > 0 && ` · ${closed} tidak dilayani`} · sisanya flat {formatRupiah(flatCost)}
        </p>
      </div>

      {ISLAND_GROUPS.map((g) => {
        const list = PROVINCES.filter((p) => g.codes.includes(p.code) && (!kw || p.name.toLowerCase().includes(kw)));
        if (!list.length) return null;
        return (
          <section key={g.id}>
            <h2 className="text-sm font-semibold">{g.label}</h2>
            <div className="mt-2 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Provinsi</th>
                    <th className="px-3 py-2 font-medium">1 kg pertama (Rp)</th>
                    <th className="px-3 py-2 font-medium">+ per kg (Rp)</th>
                    <th className="px-3 py-2 font-medium">Estimasi</th>
                    <th className="px-3 py-2 font-medium">Contoh 2 kg</th>
                    <th className="px-3 py-2 font-medium">Dilayani</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((p) => {
                    const r = rows[p.code];
                    const base = r.baseCost === "" ? null : Number(r.baseCost);
                    const off = !r.available;
                    return (
                      <tr key={p.code} className={off ? "bg-muted/40 text-muted-foreground" : undefined}>
                        <td className="px-3 py-2 font-medium">{p.name}</td>
                        <td className="px-3 py-2">
                          <input inputMode="numeric" aria-label={`Tarif 1 kg ${p.name}`} className={input} value={r.baseCost} onChange={(e) => set(p.code, "baseCost", num(e.target.value))} placeholder={`flat ${flatCost}`} disabled={off} />
                        </td>
                        <td className="px-3 py-2">
                          <input inputMode="numeric" aria-label={`Tambahan per kg ${p.name}`} className={input} value={r.perKg} onChange={(e) => set(p.code, "perKg", num(e.target.value))} placeholder="0" disabled={off || base === null} />
                        </td>
                        <td className="px-3 py-2">
                          <input aria-label={`Estimasi ${p.name}`} className={input} value={r.etd} onChange={(e) => set(p.code, "etd", e.target.value)} placeholder="2-3 hari" disabled={off || base === null} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {off ? "Tidak dilayani" : base === null ? formatRupiah(flatCost) : formatRupiah(base + Number(r.perKg || 0))}
                        </td>
                        <td className="px-3 py-2">
                          <input type="checkbox" aria-label={`Dilayani ${p.name}`} className="size-4 accent-foreground" checked={!off} onChange={(e) => set(p.code, "available", e.target.checked)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
        <p className={`text-sm ${msg ? (msg.ok ? "text-emerald-700" : "text-destructive") : "text-muted-foreground"}`}>
          {msg?.text ?? (dirty ? "Ada perubahan yang belum disimpan." : "Semua tersimpan.")}
        </p>
        <Button onClick={save} disabled={saving || !dirty}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Simpan
        </Button>
      </div>
    </div>
  );
}
