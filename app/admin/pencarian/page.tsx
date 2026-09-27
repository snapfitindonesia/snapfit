import Link from "next/link";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const DAYS = 90;

// Kata kunci dari pencarian di /produk. "Tanpa hasil" = produk yang dicari
// pembeli tapi belum ada/stok habis → bahan restock & impor produk baru.
export default async function AdminPencarianPage() {
  const since = { lastAt: { gte: new Date(Date.now() - DAYS * 86_400_000) } };
  const [zero, top, totals] = await Promise.all([
    db.searchTerm.findMany({ where: { ...since, zeroCount: { gt: 0 } }, orderBy: [{ zeroCount: "desc" }, { lastAt: "desc" }], take: 50 }),
    db.searchTerm.findMany({ where: since, orderBy: [{ count: "desc" }, { lastAt: "desc" }], take: 50 }),
    db.searchTerm.aggregate({ where: since, _sum: { count: true, zeroCount: true }, _count: true }),
  ]);
  const searches = totals._sum.count ?? 0;
  const zeroSearches = totals._sum.zeroCount ?? 0;

  return (
    <div>
      <h1 className="text-xl font-semibold">Pencarian</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Kata kunci yang dicari pengunjung di halaman produk ({DAYS} hari terakhir). Pencarian{" "}
        <b>tanpa hasil</b> = produk/tipe yang diminati tapi belum tersedia — bahan untuk restock atau impor dari Ginee.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3 sm:max-w-lg">
        <Stat label="Pencarian" value={searches.toLocaleString("id-ID")} />
        <Stat label="Kata kunci unik" value={totals._count.toLocaleString("id-ID")} />
        <Stat label="Tanpa hasil" value={searches ? `${Math.round((zeroSearches / searches) * 100)}%` : "0%"} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <TermTable
          title="Tidak ada hasil"
          hint="Paling sering dicari tapi hasilnya kosong."
          rows={zero.map((t) => ({ term: t.term, n: t.zeroCount, now: t.lastResults, at: t.lastAt }))}
          countLabel="× kosong"
        />
        <TermTable
          title="Paling dicari"
          hint="Semua kata kunci, terbanyak dulu."
          rows={top.map((t) => ({ term: t.term, n: t.count, now: t.lastResults, at: t.lastAt }))}
          countLabel="× dicari"
        />
      </div>
    </div>
  );
}

function TermTable({
  title,
  hint,
  rows,
  countLabel,
}: {
  title: string;
  hint: string;
  rows: { term: string; n: number; now: number; at: Date }[];
  countLabel: string;
}) {
  return (
    <section>
      <h2 className="font-semibold">{title}</h2>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Belum ada data.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {rows.map((r) => (
            <li key={r.term} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <Link href={`/produk?q=${encodeURIComponent(r.term)}`} target="_blank" className="min-w-0 truncate font-medium hover:underline">
                {r.term}
              </Link>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                <b className="text-foreground">{r.n}</b> {countLabel}
                <span className="block">
                  {r.now > 0 ? `sekarang ${r.now} hasil` : "masih kosong"} ·{" "}
                  {r.at.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
