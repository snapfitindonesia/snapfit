"use client";

import { useMemo } from "react";

type Cat = { id: string; name: string; parentId: string | null };

const sel = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

/**
 * Pemilih kategori bertingkat: Brand → Seri → Model.
 * value = id kategori terpilih (level mana pun). onChange kirim id terdalam.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: Cat[];
  value: string;
  onChange: (id: string) => void;
}) {
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const childrenOf = (pid: string | null) =>
    categories.filter((c) => (c.parentId ?? null) === (pid ?? null));

  // Rantai dari value: [brandId, seriId, modelId] (parsial).
  const chain = useMemo(() => {
    const arr: string[] = [];
    let cur = value ? byId.get(value) : undefined;
    while (cur) {
      arr.unshift(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return arr;
  }, [value, byId]);

  const brandId = chain[0] ?? "";
  const seriId = chain[1] ?? "";
  const modelId = chain[2] ?? "";

  const brands = childrenOf(null);
  const seris = brandId ? childrenOf(brandId) : [];
  const models = seriId ? childrenOf(seriId) : [];

  return (
    <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
      <select className={sel} value={brandId} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Brand —</option>
        {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>

      <select
        className={sel}
        value={seriId}
        disabled={!brandId || seris.length === 0}
        onChange={(e) => onChange(e.target.value || brandId)}
      >
        <option value="">{seris.length ? "— Seri —" : "(tanpa seri)"}</option>
        {seris.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      <select
        className={sel}
        value={modelId}
        disabled={!seriId || models.length === 0}
        onChange={(e) => onChange(e.target.value || seriId)}
      >
        <option value="">{models.length ? "— Model —" : "(tanpa model)"}</option>
        {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  );
}
