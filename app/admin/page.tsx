import Link from "next/link";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/format";
import { getDashboardStats } from "@/lib/admin/stats";
import { CUSTOMER_STATUS } from "@/lib/order-status";

export const dynamic = "force-dynamic";

// Target omzet bulan berjalan — ubah sesuai target tokomu.
const MONTHLY_TARGET = 25_000_000;

type Addr = { name?: string; city?: string } | null;

function pctChange(cur: number, prev: number) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const st = await getDashboardStats(now);
  const { d0, ago } = st;

  // Varian terjual → produk & kategori (merek = induk kategori, lini = kategori).
  const variants = await db.variant.findMany({
    where: { id: { in: [...st.sold.keys()] } },
    select: { id: true, product: { select: { name: true, category: { select: { name: true, parent: { select: { name: true } } } } } } },
  });
  const vInfo = new Map(variants.map((v) => [v.id, v.product]));

  const last30 = ago(30), prev30 = ago(60);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  type Sale = (typeof st.recentSales)[number];
  const inRange = (arr: Sale[], from: Date, to: Date) => arr.filter((o) => o.createdAt >= from && o.createdAt < to);

  // ---- Kartu statistik + delta (30 hari vs 30 hari sebelumnya) ----
  const paidCur = inRange(st.recentSales, last30, now);
  const paidPrev = inRange(st.recentSales, prev30, last30);
  const sum = (arr: Sale[]) => arr.reduce((n, o) => n + o.total, 0);
  const units = (arr: Sale[]) => arr.reduce((n, o) => n + o.items.reduce((m, it) => m + it.qty, 0), 0);
  const custSet = (arr: Sale[]) => {
    const s = new Set<string>();
    for (const o of arr) s.add(o.userId ?? `g:${(o.address as { phone?: string } | null)?.phone ?? (o.address as Addr)?.name ?? ""}`);
    return s.size;
  };

  const stats = [
    { label: "Total Penjualan", value: formatRupiah(st.omzetTotal), delta: pctChange(sum(paidCur), sum(paidPrev)) },
    { label: "Total Pesanan", value: st.orderCount.toLocaleString("id-ID"), delta: pctChange(st.ordersCur, st.ordersPrev) },
    { label: "Produk Terjual", value: st.unitsTotal.toLocaleString("id-ID"), delta: pctChange(units(paidCur), units(paidPrev)) },
    { label: "Total Pelanggan", value: st.customersTotal.toLocaleString("id-ID"), delta: pctChange(custSet(paidCur), custSet(paidPrev)) },
  ];

  // ---- Grafik revenue: minggu ini vs minggu lalu (harian) ----
  const dayOmzet = (offset: number) => sum(inRange(st.recentSales, ago(offset), ago(offset - 1)));
  const thisWeek = Array.from({ length: 7 }, (_, i) => dayOmzet(6 - i)); // 6..0 hari lalu
  const lastWeek = Array.from({ length: 7 }, (_, i) => dayOmzet(13 - i)); // 13..7 hari lalu
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    ago(6 - i).toLocaleDateString("id-ID", { weekday: "short" }));
  const weekTotal = thisWeek.reduce((a, b) => a + b, 0);
  const lastWeekTotal = lastWeek.reduce((a, b) => a + b, 0);

  // ---- Penjualan per lokasi (kota) ----
  const cities = st.cities;
  const cityMax = Math.max(1, ...cities.map((c) => c[1]));

  // ---- Donut per merek & produk terlaris (dari agregat per varian) ----
  const brandMap = new Map<string, number>();
  const soldMap = new Map<string, { qty: number; amount: number; line: string }>();
  for (const [variantId, s] of st.sold) {
    const p = vInfo.get(variantId);
    const brand = p?.category?.parent?.name ?? p?.category?.name ?? "Lainnya";
    brandMap.set(brand, (brandMap.get(brand) ?? 0) + s.amount);
    const name = p?.name ?? s.name.split(" — ")[0]!; // varian terhapus → nama dari snapshot pesanan
    const cur = soldMap.get(name) ?? { qty: 0, amount: 0, line: p?.category?.name ?? "—" };
    cur.qty += s.qty;
    cur.amount += s.amount;
    soldMap.set(name, cur);
  }
  const brands = [...brandMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const brandTotal = Math.max(1, brands.reduce((n, b) => n + b[1], 0));
  const terlaris = [...soldMap.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 6);
  const orders = st.recentOrders;

  // ---- Target bulanan ----
  const omzetBulan = sum(inRange(st.recentSales, monthStart, now));
  const omzetHariIni = sum(inRange(st.recentSales, d0, now));
  const targetPct = Math.min(100, Math.round((omzetBulan / MONTHLY_TARGET) * 100));

  const palette = ["#f26522", "#f59e0b", "#8b5cf6", "#0ea5e9", "#94a3b8"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Laporan Analitik</h1>
          <p className="text-sm text-muted-foreground">Ringkasan penjualan toko SNAPFIT</p>
        </div>
        <Link href="/admin/pesanan" className="hidden rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted sm:block">
          Lihat pesanan
        </Link>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">{s.value}</p>
            <Delta value={s.delta} />
          </div>
        ))}
      </div>

      {/* Revenue + Lokasi + Donut */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Revenue</h2>
            <div className="flex items-center gap-4 text-xs">
              <Legend color="#f26522" label={`Minggu ini ${formatRupiah(weekTotal)}`} />
              <Legend color="#cbd5e1" label={`Minggu lalu ${formatRupiah(lastWeekTotal)}`} />
            </div>
          </div>
          <LineChart thisWeek={thisWeek} lastWeek={lastWeek} labels={dayLabels} />
        </div>

        {/* Sales by location */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Penjualan per Lokasi</h2>
          <div className="mt-4 space-y-3">
            {cities.length ? cities.map(([city, val]) => (
              <div key={city}>
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate text-muted-foreground">{city}</span>
                  <span className="font-medium">{formatRupiah(val)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-[5px] bg-brand" style={{ width: `${(val / cityMax) * 100}%` }} />
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">Belum ada data lokasi.</p>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top selling products */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Produk Terlaris</h2>
            <Link href="/admin/produk" className="text-xs text-muted-foreground hover:text-foreground">Lihat semua</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2 font-medium">Produk</th>
                  <th className="pb-2 font-medium">Kategori</th>
                  <th className="pb-2 text-right font-medium">Terjual</th>
                  <th className="pb-2 text-right font-medium">Nilai</th>
                </tr>
              </thead>
              <tbody>
                {terlaris.length ? terlaris.map(([name, s]) => (
                  <tr key={name} className="border-b border-border/60 last:border-0">
                    <td className="max-w-[200px] truncate py-2.5 pr-3 font-medium">{name}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{s.line}</td>
                    <td className="py-2.5 text-right">{s.qty}</td>
                    <td className="py-2.5 text-right font-medium">{formatRupiah(s.amount)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Belum ada penjualan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Donut per merek */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Penjualan per Merek</h2>
          {brands.length ? (
            <>
              <Donut data={brands.map(([, v]) => v)} colors={palette} />
              <div className="mt-4 space-y-2">
                {brands.map(([name, val], i) => (
                  <div key={name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: palette[i] }} />
                      <span className="text-muted-foreground">{name}</span>
                    </span>
                    <span className="font-medium">{Math.round((val / brandTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="mt-4 text-sm text-muted-foreground">Belum ada penjualan.</p>}
        </div>
      </div>

      {/* Target bulanan */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pesanan Terbaru</h2>
            <Link href="/admin/pesanan" className="text-xs text-muted-foreground hover:text-foreground">Lihat semua</Link>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
                <span className="font-mono text-xs">{o.midtransOrderId ?? o.id.slice(0, 8)}</span>
                <span className="truncate text-xs text-muted-foreground">{(o.address as Addr)?.name ?? "—"}</span>
                <span className="rounded-[5px] bg-muted px-2 py-0.5 text-xs">{CUSTOMER_STATUS[o.status]?.label ?? o.status}</span>
                <span className="font-medium">{formatRupiah(o.total)}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="text-muted-foreground">Belum ada pesanan.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Target Bulan Ini</h2>
          <p className="text-xs text-muted-foreground">Target: {formatRupiah(MONTHLY_TARGET)}</p>
          <Gauge percent={targetPct} />
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
            <div>
              <p className="text-[11px] text-muted-foreground">Target</p>
              <p className="text-sm font-semibold">{formatRupiah(MONTHLY_TARGET).replace("Rp", "Rp ")}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Bulan ini</p>
              <p className="text-sm font-semibold text-brand">{formatRupiah(omzetBulan)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Hari ini</p>
              <p className="text-sm font-semibold">{formatRupiah(omzetHariIni)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Presentational (SVG) ---------------- */

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-600"}`}>
      <span>{up ? "▲" : "▼"}</span>
      <span>{Math.abs(value)}%</span>
      <span className="font-normal text-muted-foreground">30 hari terakhir</span>
    </p>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function LineChart({ thisWeek, lastWeek, labels }: { thisWeek: number[]; lastWeek: number[]; labels: string[] }) {
  const W = 520, H = 180, pad = 8;
  const max = Math.max(1, ...thisWeek, ...lastWeek);
  const x = (i: number) => pad + (i / (thisWeek.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - 24 - (v / max) * (H - 40);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={y(max * g)} y2={y(max * g)} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
        ))}
        <path d={path(lastWeek)} fill="none" stroke="#cbd5e1" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={path(thisWeek)} fill="none" stroke="#f26522" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {thisWeek.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={3} fill="#f26522" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10px] text-muted-foreground">
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

function Donut({ data, colors }: { data: number[]; colors: string[] }) {
  const total = Math.max(1, data.reduce((a, b) => a + b, 0));
  const r = 54, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="mt-4 flex justify-center">
      <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
        <circle cx={70} cy={70} r={r} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={16} />
        {data.map((v, i) => {
          const len = (v / total) * c;
          const el = (
            <circle key={i} cx={70} cy={70} r={r} fill="none" stroke={colors[i % colors.length]}
              strokeWidth={16} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
      </svg>
    </div>
  );
}

function Gauge({ percent }: { percent: number }) {
  const cx = 80, cy = 80, r = 62;
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const theta = Math.PI - p * Math.PI; // 180°→0°
  const ex = cx + r * Math.cos(theta), ey = cy - r * Math.sin(theta);
  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const val = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  return (
    <div className="relative mt-3">
      <svg viewBox="0 0 160 96" className="w-full">
        <path d={track} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={14} strokeLinecap="round" />
        <path d={val} fill="none" stroke="#f26522" strokeWidth={14} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-x-0 bottom-1 text-center">
        <p className="text-2xl font-bold">{percent}%</p>
        <p className="text-[11px] text-muted-foreground">tercapai</p>
      </div>
    </div>
  );
}
