import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { CampaignCountdown } from "@/components/shop/campaign-countdown";
import { VoucherChips } from "@/components/shop/voucher-chips";
import { getCampaignProducts, getFeaturedProducts } from "@/lib/actions/product";
import { getActiveVouchers } from "@/lib/actions/voucher";
import { CAMPAIGNS, CAMPAIGN_SLUGS, campaignWindow, fmtWibDate, isCampaignSlug } from "@/lib/campaigns";

// Halaman kampanye berulang (Payday, Tanggal Kembar). Produk = diskon berlabel
// kampanye ini (Admin → Diskon). ISR 5 mnt; simpan diskon → revalidate.
export const revalidate = 300;
export const dynamicParams = false;
export const generateStaticParams = () => CAMPAIGN_SLUGS.map((slug) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isCampaignSlug(slug)) return {};
  const c = CAMPAIGNS[slug];
  return {
    title: `${c.title} — Diskon Aksesoris HP Original`,
    description: c.seoDescription,
    alternates: { canonical: `/promo/${slug}` },
    openGraph: { title: `${c.title} | SNAPFIT Indonesia`, description: c.seoDescription, url: `/promo/${slug}` },
  };
}

export default async function PromoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCampaignSlug(slug)) notFound();
  const c = CAMPAIGNS[slug];
  const other = CAMPAIGNS[CAMPAIGN_SLUGS.find((s) => s !== slug)!];
  const win = campaignWindow(slug);

  const [data, vouchers] = await Promise.all([getCampaignProducts(slug), getActiveVouchers()]);
  const hasLive = data.live.length > 0;
  const hasUpcoming = !hasLive && data.upcoming.length > 0;
  const fallback = !hasLive && !hasUpcoming ? await getFeaturedProducts(8) : [];

  // Status & hitung mundur: pakai jadwal diskon yang diatur admin bila ada,
  // kalau belum ada pakai jadwal kalender kampanye.
  const status = hasLive
    ? { badge: "Sedang berlangsung", target: data.liveEndsAt, label: "Promo berakhir dalam" }
    : hasUpcoming
      ? { badge: `Mulai ${fmtWibDate(data.upcomingStartsAt!)}`, target: data.upcomingStartsAt, label: "Promo dimulai dalam" }
      : win.live
        ? { badge: "Periode promo", target: win.end, label: "Periode berakhir dalam" }
        : { badge: `Berikutnya ${fmtWibDate(win.start)}`, target: win.start, label: "Promo dimulai dalam" };

  return (
    <div>
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-3 py-1 text-xs font-semibold text-brand-foreground">
            {status.badge}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">{c.title}</h1>
          <p className="mt-3 max-w-xl text-base text-background/75 sm:text-lg">{c.tagline}</p>
          {hasLive && data.livePercent > 0 && (
            <p className="mt-4 text-2xl font-extrabold text-brand">Diskon hingga {data.livePercent}%</p>
          )}
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-background/70">
            <CalendarDays className="size-4" /> {c.schedule}
          </p>
          {status.target && (
            <div className="mt-6">
              <CampaignCountdown target={status.target.toISOString()} label={status.label} />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {vouchers.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Voucher yang bisa dipakai</h2>
            <p className="mt-1 text-sm text-muted-foreground">Salin kodenya lalu tempel di halaman checkout.</p>
            <div className="mt-4">
              <VoucherChips vouchers={vouchers.map((v) => ({ code: v.code, label: v.label, minPurchase: v.minPurchase }))} />
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {hasLive ? "Produk promo" : hasUpcoming ? "Bocoran produk promo" : "Produk pilihan"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasLive
              ? `${data.live.length} produk dengan harga spesial${data.liveEndsAt ? ` sampai ${fmtWibDate(data.liveEndsAt)}` : ""}.`
              : hasUpcoming
                ? `Diskon hingga ${data.upcomingPercent}% berlaku mulai ${fmtWibDate(data.upcomingStartsAt!)} — harga di bawah masih harga normal.`
                : `Daftar produk promo diumumkan menjelang ${c.title.toLowerCase()} (${fmtWibDate(win.live ? win.end : win.start)}). Sementara itu, cek produk unggulan kami.`}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
            {(hasLive ? data.live : hasUpcoming ? data.upcoming : fallback).map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        </section>

        <section className="my-14 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border p-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Promo lainnya</p>
            <p className="text-lg font-semibold">{other.title}</p>
            <p className="text-sm text-muted-foreground">{other.schedule}</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/promo/${other.slug}`} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-foreground">
              Lihat {other.title} <ArrowRight className="size-4" />
            </Link>
            <Link href="/produk" className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
              Semua produk
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
