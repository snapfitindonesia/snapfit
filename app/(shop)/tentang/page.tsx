import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Crosshair, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { jsonLdHtml } from "@/lib/json-ld";
import { waChatUrl } from "@/lib/contact";
import { BRAND_DEFINITION, BRAND_SUMMARY, ORG_ID, SITE, getOfficialProfiles, organizationNode, brandNode } from "@/lib/brand";

// Halaman identitas merek: definisi tegas "SNAPFIT adalah merek …" (proper noun) + akun resmi, untuk pembeli
// sekaligus mesin pencari/AI. Data terstruktur AboutPage → Organization & Brand yang sama dengan beranda.
export const revalidate = 3600; // 1 jam; akun resmi segar saat Admin → Links disimpan (revalidateTag)

const DESCRIPTION = `${BRAND_DEFINITION} ${BRAND_SUMMARY}`;

export const metadata: Metadata = {
  title: "Tentang SNAPFIT",
  description: DESCRIPTION,
  alternates: { canonical: "/tentang" },
  openGraph: { title: "Tentang SNAPFIT", description: DESCRIPTION, url: "/tentang" },
};

const PRODUCTS = [
  { title: "Casing smartphone & tablet", desc: "Case presisi per tipe — lubang tombol, kamera & port pas, termasuk varian MagSafe." },
  { title: "Pelindung layar", desc: "Tempered glass & hydrogel: bening, privacy, matte, hingga untuk HP lipat." },
  { title: "Pelindung kamera", desc: "Lens protector & camera guard yang menutup lensa tanpa mengganggu hasil foto." },
  { title: "Aksesori pendukung", desc: "Back glass, pelindung tombol & aksesori untuk iPad, MacBook dan konsol genggam." },
];

const VALUES = [
  { icon: Crosshair, title: "Presisi per tipe", desc: "Setiap produk dibuat untuk tipe perangkat tertentu — pilih tipe HP-mu, pasang, pas." },
  { icon: ShieldCheck, title: "100% original", desc: "Produk resmi SNAPFIT dan bergaransi." },
  { icon: RotateCcw, title: "7 hari pengembalian", desc: "Untuk produk cacat produksi atau salah kirim." },
  { icon: MessageCircle, title: "Dukungan via WhatsApp", desc: "Tanya tipe yang cocok sebelum membeli." },
];

export default async function AboutPage() {
  const profiles = await getOfficialProfiles();
  const sameAs = profiles.map((p) => p.url);
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE}/tentang#page`,
        url: `${SITE}/tentang`,
        name: "Tentang SNAPFIT",
        description: DESCRIPTION,
        mainEntity: { "@id": ORG_ID },
      },
      organizationNode(sameAs),
      brandNode(sameAs),
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(jsonLd)} />

      <p className="text-sm font-medium text-muted-foreground">Tentang kami</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tentang SNAPFIT</h1>
      <p className="mt-5 text-lg leading-relaxed">
        <strong>SNAPFIT</strong> adalah merek pelindung layar, pelindung kamera, dan casing smartphone presisi asal
        Indonesia.
      </p>
      <p className="mt-3 leading-relaxed text-muted-foreground">
        {BRAND_SUMMARY} Produk SNAPFIT dijual di website resmi <Link href="/" className="font-medium text-foreground underline underline-offset-2">snapfit.id</Link>{" "}
        dan di toko resmi SNAPFIT di marketplace.
      </p>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Yang kami buat</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {PRODUCTS.map((p) => (
          <div key={p.title} className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Selain produk SNAPFIT, toko kami juga menjual aksesori dari beberapa merek pilihan lain — nama mereknya selalu
        tertulis di halaman produk.
      </p>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Kenapa SNAPFIT</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex gap-3 rounded-xl border border-border p-4">
            <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <div>
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Toko & akun resmi SNAPFIT</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Hanya akun di bawah ini yang resmi milik SNAPFIT. Berbelanja di sini menjamin produk original.
      </p>
      <ul className="mt-4 space-y-2">
        <li>
          <Link href="/" className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/50">
            <span><b>Website resmi</b> · snapfit.id</span>
            <BadgeCheck className="size-4 text-emerald-600" aria-label="Resmi" />
          </Link>
        </li>
        {profiles.map((p) => (
          <li key={p.url}>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer me"
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/50"
            >
              <span><b>{p.label}</b> · SNAPFIT</span>
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-12 rounded-2xl bg-muted/50 p-6">
        <h2 className="text-lg font-semibold tracking-tight">Butuh bantuan memilih?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Kirim tipe HP-mu, kami bantu carikan yang pas.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={waChatUrl("Halo SNAPFIT, saya mau tanya produk yang cocok untuk HP saya:")}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Chat WhatsApp
          </a>
          <Link href="/produk" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-background">
            Lihat semua produk
          </Link>
        </div>
      </div>
    </div>
  );
}
