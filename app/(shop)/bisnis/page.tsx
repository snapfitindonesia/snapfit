import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardList,
  Gift,
  Handshake,
  MessageCircle,
  PackageCheck,
  Store,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BusinessForm } from "@/components/shop/business-form";
import { waChatUrl } from "@/lib/contact";
import { TYPE } from "@/lib/typography";
import { cn } from "@/lib/utils";

// Halaman Kerja Sama Bisnis (B2B). Statis (tanpa query DB) — formulir dikirim lewat Server Action.
// Isi sengaja TANPA angka syarat (min. order, diskon): penawaran dibuat per permintaan.
export const metadata: Metadata = {
  title: "Kerja Sama Bisnis — Reseller, Corporate Gift & Pengadaan",
  description:
    "Kerja sama B2B dengan SNAPFIT: harga khusus untuk reseller & toko, case dan aksesori custom logo untuk corporate gift, serta pengadaan aksesori untuk perusahaan. Minta penawaran gratis.",
  alternates: { canonical: "/bisnis" },
};

const WA_TEXT = "Halo SNAPFIT, saya tertarik kerja sama bisnis. Boleh minta info?";

const PROGRAMS = [
  {
    icon: Store,
    title: "Reseller & toko",
    desc: "Untuk toko HP, toko aksesori, dan penjual online yang ingin menjual produk SNAPFIT.",
    points: ["Harga khusus sesuai jumlah pembelian", "Produk original bergaransi resmi", "Bisa mulai dari jumlah kecil, didiskusikan"],
  },
  {
    icon: Gift,
    title: "Corporate gift & custom logo",
    desc: "Case dan aksesori dengan logo atau desain perusahaanmu — untuk karyawan, klien, atau event.",
    points: ["Desain & jumlah disesuaikan kebutuhan", "Pilihan tipe HP, tablet & aksesori", "Contoh desain sebelum produksi"],
  },
  {
    icon: Building2,
    title: "Pengadaan perusahaan & instansi",
    desc: "Kebutuhan pelindung perangkat kantor dalam jumlah besar — case, pelindung layar, dan lainnya.",
    points: ["Penawaran harga tertulis", "Satu kontak untuk seluruh pesanan", "Pengiriman ke seluruh Indonesia"],
  },
] as const;

const STEPS = [
  { icon: ClipboardList, title: "Kirim permintaan", desc: "Isi formulir di bawah atau chat WhatsApp — ceritakan kebutuhanmu." },
  { icon: MessageCircle, title: "Kami hubungi & kirim penawaran", desc: "Tim kami menghubungimu untuk detail produk, jumlah, dan harga." },
  { icon: PackageCheck, title: "Sepakati & pesanan diproses", desc: "Setelah sepakat, pesanan disiapkan dan dikirim ke alamatmu." },
] as const;

const WHY = [
  { icon: BadgeCheck, title: "100% original", desc: "Produk resmi SNAPFIT dan merek yang kami distribusikan, bergaransi." },
  { icon: Truck, title: "Kirim ke seluruh Indonesia", desc: "Dikemas rapi dan aman, dari gudang kami langsung ke alamatmu." },
  { icon: Handshake, title: "Dilayani langsung", desc: "Satu kontak tim SNAPFIT dari penawaran sampai barang diterima." },
] as const;

const FAQ = [
  {
    q: "Berapa minimal pemesanan?",
    a: "Tergantung jenis kerja sama dan produknya. Ceritakan kebutuhanmu — kami jelaskan pilihannya di penawaran.",
  },
  {
    q: "Butuh stok siap kirim dengan harga grosir?",
    a: "Lihat halaman Grosir Deadstock untuk paket grosir yang bisa langsung dipesan.",
    link: { href: "/grosir", label: "Buka Grosir Deadstock" },
  },
  {
    q: "Bagaimana pembayaran dan pengirimannya?",
    a: "Metode pembayaran, jadwal, dan ongkos kirim disepakati bersama di penawaran, sesuai jumlah dan tujuan pengiriman.",
  },
] as const;

export default function BisnisPage() {
  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
      {/* Pembuka */}
      <section className="py-12 sm:py-16 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">SNAPFIT untuk Bisnis</p>
        <h1 className="mt-3 max-w-3xl text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] text-balance sm:text-5xl lg:text-[56px]">
          Kerja sama dengan SNAPFIT
        </h1>
        <p className={cn(TYPE.sub, "mt-4 max-w-2xl text-muted-foreground")}>
          Reseller, corporate gift dengan logo perusahaan, atau pengadaan aksesori untuk kantor — kami siapkan
          penawaran yang sesuai kebutuhan bisnismu.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href="#formulir">
              Minta penawaran <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={waChatUrl(WA_TEXT)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-4" /> Chat WhatsApp
            </a>
          </Button>
        </div>
      </section>

      {/* Program */}
      <section aria-labelledby="program" className="border-t border-border py-12 sm:py-16">
        <h2 id="program" className={TYPE.h2}>
          Pilihan kerja sama
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {PROGRAMS.map(({ icon: Icon, title, desc, points }) => (
            <article key={title} className="flex flex-col rounded-2xl border border-border bg-card p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-muted">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className={cn(TYPE.h3, "mt-4")}>{title}</h3>
              <p className={cn(TYPE.body, "mt-2 text-muted-foreground")}>{desc}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Alasan */}
      <section aria-labelledby="kenapa" className="border-t border-border py-12 sm:py-16">
        <h2 id="kenapa" className={TYPE.h2}>
          Kenapa SNAPFIT
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <div key={title}>
              <Icon className="size-6" aria-hidden />
              <h3 className="mt-3 text-base font-semibold">{title}</h3>
              <p className={cn(TYPE.body, "mt-1 text-muted-foreground")}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Alur */}
      <section aria-labelledby="alur" className="border-t border-border py-12 sm:py-16">
        <h2 id="alur" className={TYPE.h2}>
          Cara kerjanya
        </h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <li key={title} className="rounded-2xl border border-border p-6">
              <span className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
                <Icon className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold">{title}</h3>
              <p className={cn(TYPE.body, "mt-1 text-muted-foreground")}>{desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Formulir */}
      <section id="formulir" aria-labelledby="form-judul" className="scroll-mt-24 border-t border-border py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
          <div>
            <h2 id="form-judul" className={TYPE.h2}>
              Minta penawaran
            </h2>
            <p className={cn(TYPE.sub, "mt-3 text-muted-foreground")}>
              Isi formulir singkat ini. Tim kami akan menghubungimu lewat email atau WhatsApp untuk membahas
              kebutuhan dan harganya — gratis, tanpa kewajiban.
            </p>
            <dl className="mt-8 space-y-5">
              {FAQ.map((f) => (
                <div key={f.q}>
                  <dt className="text-sm font-semibold">{f.q}</dt>
                  <dd className={cn(TYPE.body, "mt-1 text-muted-foreground")}>
                    {f.a}
                    {"link" in f && (
                      <>
                        {" "}
                        <Link href={f.link.href} className="font-medium text-foreground underline underline-offset-2">
                          {f.link.label}
                        </Link>
                      </>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <BusinessForm />
        </div>
      </section>
    </div>
  );
}
