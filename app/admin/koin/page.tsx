import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CoinAdjustForm } from "@/components/admin/coin-adjust-form";
import {
  COIN_AUTO_DONE_DAYS,
  COIN_CASHBACK_RATE,
  COIN_EXPIRE_DAYS,
  COIN_MAX_USE_RATE,
  COIN_MIN_USE,
  COIN_REVIEW_BONUS,
  COIN_SIGNUP_BONUS,
} from "@/lib/coins-rules";

export const dynamic = "force-dynamic";

const KIND: Record<string, string> = {
  SIGNUP: "Bonus daftar",
  CASHBACK: "Cashback",
  REVIEW: "Bonus ulasan",
  REFUND: "Dikembalikan",
  SPEND: "Dipakai",
  EXPIRE: "Hangus",
  REVOKE: "Cashback ditarik",
  ADJUST: "Koreksi admin",
};
const n = (x: number) => x.toLocaleString("id-ID");
const fmt = (d: Date) =>
  d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export default async function AdminCoinsPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [outstanding, issued, spent, balances, recent] = await Promise.all([
    db.coinEntry.aggregate({ where: { remaining: { gt: 0 }, expiresAt: { gt: now } }, _sum: { remaining: true } }),
    db.coinEntry.aggregate({ where: { amount: { gt: 0 }, createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.coinEntry.aggregate({ where: { kind: "SPEND", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.coinEntry.groupBy({
      by: ["userId"],
      where: { remaining: { gt: 0 }, expiresAt: { gt: now } },
      _sum: { remaining: true },
      orderBy: { _sum: { remaining: "desc" } },
      take: 30,
    }),
    db.coinEntry.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
  ]);

  // Email member (Supabase Auth) untuk daftar di halaman ini.
  const ids = [...new Set([...balances.map((b) => b.userId), ...recent.map((r) => r.userId)])];
  const emails = new Map<string, string>();
  const admin = createSupabaseAdminClient();
  if (admin) {
    await Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          if (data.user?.email) emails.set(id, data.user.email);
        } catch {
          // user terhapus — tampilkan id
        }
      }),
    );
  }
  const who = (id: string) => emails.get(id) ?? `${id.slice(0, 8)}…`;

  return (
    <div>
      <h1 className="text-xl font-semibold">Koin Member</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        1 koin = Rp1. Cashback {Math.round(COIN_CASHBACK_RATE * 100)}% (tanpa ongkir) saat pesanan <b>Selesai</b>, atau otomatis{" "}
        {COIN_AUTO_DONE_DAYS} hari setelah <b>Dikirim</b>. Bonus daftar {n(COIN_SIGNUP_BONUS)}, ulasan disetujui {n(COIN_REVIEW_BONUS)}.
        Pakai mulai {n(COIN_MIN_USE)} koin, maks. {Math.round(COIN_MAX_USE_RATE * 100)}% subtotal. Hangus {Math.round(COIN_EXPIRE_DAYS / 30)}{" "}
        bulan (email H-7). Pesanan dibatalkan → koin dikembalikan & cashback ditarik otomatis.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Saldo beredar (kewajiban toko)" value={`Rp${n(outstanding._sum.remaining ?? 0)}`} />
        <Stat label="Koin diberikan bulan ini" value={n(issued._sum.amount ?? 0)} />
        <Stat label="Koin dipakai bulan ini" value={n(Math.abs(spent._sum.amount ?? 0))} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold">Saldo terbesar</h2>
          {balances.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada member dengan saldo.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
              {balances.map((b) => (
                <li key={b.userId} className="flex justify-between gap-3 px-3 py-2">
                  <span className="truncate">{who(b.userId)}</span>
                  <span className="shrink-0 font-semibold">{n(b._sum.remaining ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-8 text-sm font-semibold">Koreksi manual</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mis. kompensasi keluhan (+) atau menarik koin yang salah (−). Alasan tampil di riwayat pembeli.
          </p>
          <CoinAdjustForm />
        </section>

        <section>
          <h2 className="text-sm font-semibold">Transaksi terbaru</h2>
          {recent.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Belum ada transaksi koin.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border text-sm">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{who(e.userId)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {fmt(e.createdAt)} · {KIND[e.kind] ?? e.kind}
                      {e.note ? ` · ${e.note}` : ""}
                    </span>
                  </span>
                  <span className={e.amount > 0 ? "shrink-0 font-semibold text-emerald-700" : "shrink-0 font-semibold text-muted-foreground"}>
                    {e.amount > 0 ? "+" : "−"}
                    {n(Math.abs(e.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
