import Link from "next/link";
import { ShoppingBag, ChevronRight, Coins, Truck, MessageCircle, Package, Sparkles, Zap, KeyRound, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountButton } from "@/components/auth/delete-account-button";
import { AuthForm } from "@/components/auth/auth-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getMyCoins } from "@/lib/actions/coins";
import { getCoinRules } from "@/lib/coins-settings";
import { activeCashback, pct } from "@/lib/coins-rules";
import { waChatUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";

export const metadata = { title: "Akun", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Menunggu pembayaran", cls: "bg-amber-100 text-amber-800" },
  PAID: { label: "Dibayar", cls: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Dikemas", cls: "bg-blue-100 text-blue-700" },
  SHIPPED: { label: "Dikirim", cls: "bg-indigo-100 text-indigo-700" },
  DONE: { label: "Selesai", cls: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Dibatalkan", cls: "bg-rose-100 text-rose-700" },
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  return user ? <MemberView user={user} /> : <GuestView />;
}

/* ------------------------------ Belum login ------------------------------ */

async function GuestView() {
  const rules = await getCoinRules();
  const cb = activeCashback(rules);
  const perks = [
    ...(rules.enabled && rules.signupBonus > 0
      ? [{ icon: Coins, title: `${rules.signupBonus.toLocaleString("id-ID")} koin gratis`, text: "Langsung masuk saat daftar — 1 koin = Rp1 potongan belanja." }]
      : []),
    ...(cb.percent > 0
      ? [{ icon: Sparkles, title: `Cashback ${pct(cb.percent)} tiap belanja`, text: cb.promo ? `Sedang promo ${cb.promo}!` : "Koin masuk otomatis setelah pesanan selesai." }]
      : []),
    { icon: Package, title: "Lacak semua pesanan", text: "Riwayat & status pengiriman tersimpan rapi di satu tempat." },
    { icon: Zap, title: "Checkout lebih cepat", text: "Alamat & kontakmu tersimpan untuk belanja berikutnya." },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-2">
        {/* Keuntungan member — di HP tampil SETELAH form masuk */}
        <section className="relative isolate order-last overflow-hidden bg-neutral-950 p-7 text-white sm:p-10 lg:order-first">
          <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-brand/40 blur-3xl" />
          <div aria-hidden className="absolute -bottom-32 -left-16 -z-10 size-72 rounded-full bg-amber-500/20 blur-3xl" />
          <span className="inline-block rounded-[5px] bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">Member SNAPFIT</span>
          <h2 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            Belanja lebih hemat, pesanan lebih mudah dipantau.
          </h2>
          <ul className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
            {perks.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <p.icon className="size-5 text-amber-300" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="block text-sm text-white/70">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-xs text-white/50">Gratis, tanpa biaya keanggotaan.</p>
        </section>

        {/* Masuk */}
        <section className="p-7 sm:p-10">
          <h1 className="text-2xl font-bold tracking-tight">Masuk ke akunmu</h1>
          <p className="mt-1 text-sm text-muted-foreground">Belum punya akun? Daftar hanya butuh 1 menit.</p>
          <div className="mt-6">
            <AuthForm mode="login" next="/akun" />
          </div>
          <div className="mt-5">
            <OAuthButtons next="/akun" />
          </div>
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Cuma mau cek pesanan?{" "}
        <Link href="/lacak" className="font-medium text-foreground underline underline-offset-2">
          Lacak tanpa login
        </Link>
      </p>
    </div>
  );
}

/* -------------------------------- Member -------------------------------- */

async function MemberView({ user }: { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }) {
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name || meta.name || user.email?.split("@")[0] || "Kak";
  const first = name.trim().split(/\s+/)[0];
  const avatar = meta.avatar_url || meta.picture || null;
  const isGoogle = user.app_metadata?.provider === "google";

  const [coins, orderCount, lastOrder] = await Promise.all([
    getMyCoins(),
    db.order.count({ where: { userId: user.id } }),
    db.order.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { midtransOrderId: true, status: true, total: true, createdAt: true, _count: { select: { items: true } } },
    }),
  ]);
  const balance = coins.loggedIn ? coins.balance : 0;

  const shortcuts = [
    { href: "/akun/pesanan", icon: ShoppingBag, title: "Pesanan Saya", text: orderCount ? `${orderCount} pesanan` : "Belum ada pesanan" },
    { href: "/akun/koin", icon: Coins, title: "Koin SNAPFIT", text: `${balance.toLocaleString("id-ID")} koin` },
    { href: "/lacak", icon: Truck, title: "Lacak Paket", text: "Cek status pengiriman" },
    { href: waChatUrl("Halo SNAPFIT, saya butuh bantuan."), icon: MessageCircle, title: "Bantuan", text: "Chat WhatsApp", external: true },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Sapaan */}
      <div className="flex flex-wrap items-center gap-4">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- foto profil Google (host luar, kecil)
          <img src={avatar} alt="" referrerPolicy="no-referrer" className="size-14 rounded-full border border-border object-cover" />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-950 text-xl font-bold uppercase text-white">
            {first.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Halo, {first}!</h1>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <SignOutButton large />
      </div>

      {/* Kartu koin */}
      {coins.loggedIn && (
        <Link
          href="/akun/koin"
          className="relative isolate mt-8 flex items-center gap-5 overflow-hidden rounded-3xl bg-neutral-950 p-6 text-white transition-transform hover:-translate-y-0.5 sm:p-8"
        >
          <div aria-hidden className="absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-amber-500/30 blur-3xl" />
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15">
            <Coins className="size-7 text-amber-300" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-white/70">Saldo koin</span>
            <span className="block text-3xl font-extrabold tracking-tight sm:text-4xl">{balance.toLocaleString("id-ID")}</span>
            <span className="block text-xs text-white/60">
              = {formatRupiah(balance)} potongan belanja
              {coins.cashback.percent > 0 && ` · cashback ${pct(coins.cashback.percent)}${coins.cashback.promo ? ` (${coins.cashback.promo})` : ""}`}
            </span>
            {coins.expiringSoon > 0 && (
              <span className="mt-2 inline-block rounded-[5px] bg-amber-400/20 px-2.5 py-0.5 text-xs font-medium text-amber-200">
                {coins.expiringSoon.toLocaleString("id-ID")} koin hangus minggu ini
              </span>
            )}
          </span>
          <ChevronRight className="size-6 shrink-0 text-white/60" />
        </Link>
      )}

      {/* Pintasan */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            {...(s.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/30 hover:bg-muted/40"
          >
            <s.icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="mt-3 block text-sm font-semibold">{s.title}</span>
            <span className="block text-xs text-muted-foreground">{s.text}</span>
          </Link>
        ))}
      </div>

      {/* Pesanan terakhir */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Pesanan terakhir</h2>
        {lastOrder ? (
          <Link
            href="/akun/pesanan"
            className="mt-3 flex items-center gap-4 rounded-2xl border border-border p-4 transition-colors hover:bg-muted/40"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Package className="size-5 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-xs text-muted-foreground">{lastOrder.midtransOrderId}</span>
              <span className="block text-sm font-semibold">
                {formatRupiah(lastOrder.total)} · {lastOrder._count.items} produk
              </span>
            </span>
            <span className={`shrink-0 rounded-[5px] px-2.5 py-1 text-xs font-medium ${(STATUS[lastOrder.status] ?? STATUS.PENDING).cls}`}>
              {(STATUS[lastOrder.status] ?? { label: lastOrder.status }).label}
            </span>
          </Link>
        ) : (
          <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
            <ShoppingBag className="size-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Belum ada pesanan. Yuk, temukan case yang pas untuk HP-mu.</p>
            <Link href="/produk" className="inline-flex h-[42px] items-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background hover:opacity-90">
              Mulai belanja
            </Link>
          </div>
        )}
      </section>

      {/* Pengaturan akun */}
      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold">Pengaturan akun</h2>
        {!isGoogle && (
          <details className="group rounded-2xl border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <KeyRound className="size-4 text-muted-foreground" />
              <span className="flex-1">Ganti password</span>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-border p-4">
              <ChangePasswordForm />
            </div>
          </details>
        )}
        <details className="group rounded-2xl border border-destructive/30">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 text-sm font-medium text-destructive [&::-webkit-details-marker]:hidden">
            <Trash2 className="size-4" />
            <span className="flex-1">Hapus akun</span>
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="border-t border-destructive/20 p-4">
            <p className="mb-3 text-xs text-muted-foreground">
              Permanen dan tidak bisa dibatalkan. Kamu tidak bisa login lagi dengan akun ini, dan saldo koin ikut hilang.
            </p>
            <DeleteAccountButton />
          </div>
        </details>
      </section>
    </div>
  );
}
