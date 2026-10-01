import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyCoins } from "@/lib/actions/coins";
import { pct } from "@/lib/coins-rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Koin SNAPFIT", robots: { index: false } };

const KIND: Record<string, string> = {
  SIGNUP: "Bonus member baru",
  CASHBACK: "Cashback belanja",
  REVIEW: "Bonus ulasan",
  REFUND: "Koin dikembalikan",
  SPEND: "Dipakai belanja",
  EXPIRE: "Hangus",
  REVOKE: "Cashback ditarik",
  ADJUST: "Penyesuaian",
};

const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
const n = (x: number) => x.toLocaleString("id-ID");

export default async function MyCoinsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/akun/koin");
  const coins = await getMyCoins();
  const entries = await db.coinEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const balance = coins.loggedIn ? coins.balance : 0;
  const r = coins.rules;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/akun" className="text-muted-foreground hover:text-foreground" aria-label="Kembali">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Koin SNAPFIT</h1>
      </div>

      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6">
        <p className="text-sm text-amber-900/80">Saldo koin</p>
        <p className="mt-1 text-4xl font-bold tracking-tight text-amber-950">{n(balance)}</p>
        <p className="mt-1 text-sm text-amber-900">1 koin = Rp1 potongan belanja</p>
        {coins.loggedIn && coins.expiringSoon > 0 && coins.expiringAt && (
          <p className="mt-3 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-950">
            <b>{n(coins.expiringSoon)} koin</b> hangus {fmt(new Date(coins.expiringAt))}. Pakai di checkout sebelum hilang.
          </p>
        )}
        <Link href="/produk" className="mt-4 inline-flex h-10 items-center rounded-[5px] bg-amber-950 px-5 text-sm font-semibold text-white hover:opacity-90">
          Belanja pakai koin
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Riwayat</h2>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Belum ada riwayat koin.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">{KIND[e.kind] ?? e.kind}</span>
                  <span className="block text-xs text-muted-foreground">
                    {fmt(e.createdAt)}
                    {e.note && e.note !== KIND[e.kind] ? ` · ${e.note}` : ""}
                    {e.amount > 0 && e.expiresAt && e.remaining > 0 ? ` · berlaku s/d ${fmt(e.expiresAt)}` : ""}
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

      <section className="mt-8 rounded-lg border border-border p-5 text-sm">
        <h2 className="font-semibold">Cara kerja koin</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {!r.enabled && <li>Program koin sedang dihentikan: tidak ada koin baru, tapi saldomu tetap bisa dipakai.</li>}
          {r.enabled && r.cashbackPercent > 0 && <li>Cashback {pct(r.cashbackPercent)} dari nilai belanja (tanpa ongkir), masuk setelah pesanan selesai.</li>}
          {coins.cashback.promo && (
            <li className="font-medium text-amber-800">
              Sedang berlangsung: {coins.cashback.promo} — cashback {pct(coins.cashback.percent)}
              {coins.cashback.until ? ` s/d ${fmt(new Date(new Date(coins.cashback.until).getTime() - 1))}` : ""}.
            </li>
          )}
          {r.enabled && (r.signupBonus > 0 || r.reviewBonus > 0) && (
            <li>
              {r.signupBonus > 0 && <>Bonus {n(r.signupBonus)} koin untuk member baru{r.reviewBonus > 0 ? ", " : "."}</>}
              {r.reviewBonus > 0 && <>{n(r.reviewBonus)} koin untuk tiap ulasan yang disetujui.</>}
            </li>
          )}
          <li>Pakai di checkout{r.minUse > 0 ? `: mulai ${n(r.minUse)} koin` : ""}, maks. {pct(r.maxUsePercent)} subtotal, tidak untuk ongkir. Bisa bersama voucher.</li>
          <li>
            Koin berlaku {expiryLabel(r.expireDays)} sejak diterima
            {r.expireNoticeDays > 0 ? `; kami ingatkan lewat email ${r.expireNoticeDays} hari sebelum hangus.` : "."}
          </li>
          <li>Pesanan dibatalkan: koin yang dipakai dikembalikan, cashback-nya ditarik.</li>
        </ul>
      </section>
    </div>
  );
}

function expiryLabel(days: number) {
  return days % 30 === 0 ? `${days / 30} bulan` : `${days} hari`;
}
