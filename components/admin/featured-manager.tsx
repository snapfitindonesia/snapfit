"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, Loader2 } from "lucide-react";
import { setProductFeatured } from "@/lib/actions/admin";

export type FeaturedRow = {
  id: string;
  name: string;
  coverImage: string | null;
  category: string | null;
  featured: boolean;
};

export function FeaturedManager({ products }: { products: FeaturedRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [onlyFeatured, setOnlyFeatured] = useState(false);

  const featuredCount = products.filter((p) => p.featured).length;

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = products;
    if (onlyFeatured) arr = arr.filter((p) => p.featured);
    if (term) arr = arr.filter((p) => p.name.toLowerCase().includes(term) || (p.category ?? "").toLowerCase().includes(term));
    // Yang unggulan tampil di atas.
    return [...arr].sort((a, b) => Number(b.featured) - Number(a.featured));
  }, [products, q, onlyFeatured]);

  async function toggle(p: FeaturedRow) {
    setBusy(p.id);
    const res = await setProductFeatured(p.id, !p.featured);
    if (res.ok) router.refresh();
    else alert(res.error ?? "Gagal.");
    setBusy(null);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-border px-3">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari produk…"
            className="w-full bg-transparent py-2 text-sm outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyFeatured} onChange={(e) => setOnlyFeatured(e.target.checked)} className="size-4 accent-brand" />
          Hanya unggulan
        </label>
        <span className="text-sm text-muted-foreground">{featuredCount} dipilih</span>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.coverImage ?? undefined} alt="" className="size-12 shrink-0 rounded-md border border-border object-contain" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
              {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
            </div>
            <button
              type="button"
              onClick={() => toggle(p)}
              disabled={busy === p.id}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
                p.featured
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {busy === p.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Star className={`size-4 ${p.featured ? "fill-brand" : ""}`} />
              )}
              {p.featured ? "Unggulan" : "Jadikan unggulan"}
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Tidak ada produk.</p>}
      </div>
    </div>
  );
}
