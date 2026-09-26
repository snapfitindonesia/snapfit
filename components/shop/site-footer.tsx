import Link from "next/link";
import Image from "@/components/ui/image";
import { Plane, Headset, RotateCcw, ShieldCheck } from "lucide-react";
import logo from "@/logosnapfit.png";
import { getNavLinks } from "@/lib/actions/product";

type FooterLink = { label: string; href: string; newTab?: boolean };
const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Belanja",
    links: [
      { label: "Semua Produk", href: "/produk" },
      { label: "Grosir Deadstock", href: "/grosir" },
      { label: "iPhone", href: "/kategori/iphone" },
      { label: "Samsung", href: "/kategori/samsung" },
      { label: "iPad", href: "/kategori/ipad" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Lacak Pesanan", href: "/lacak" },
      { label: "Cara Pesan", href: "/bantuan#cara-pesan" },
      { label: "Pengiriman", href: "/bantuan#pengiriman" },
      { label: "Pengembalian", href: "/bantuan#pengembalian" },
      { label: "Hubungi Kami", href: "/bantuan#hubungi" },
    ],
  },
  {
    title: "SNAPFIT",
    links: [
      { label: "Tentang", href: "#" },
      { label: "Kebijakan Privasi", href: "/privacy" },
      { label: "Syarat & Ketentuan", href: "/terms" },
    ],
  },
];

const TRUST = [
  { icon: Plane, title: "Gratis Ongkir", desc: "Gratis ongkir min. belanja Rp150rb" },
  { icon: Headset, title: "Dukungan 24/7", desc: "Bantuan via WhatsApp tiap hari" },
  { icon: RotateCcw, title: "7 Hari Pengembalian", desc: "Retur mudah untuk produk cacat" },
  { icon: ShieldCheck, title: "100% Original", desc: "Produk resmi & bergaransi" },
];

export async function SiteFooter() {
  const custom = await getNavLinks("FOOTER");
  const columns = custom.length
    ? [...COLUMNS, { title: "Menu", links: custom.map((l) => ({ label: l.label, href: l.url, newTab: l.newTab })) }]
    : COLUMNS;
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Trust strip — kartu (judul + subjudul kiri, ikon kanan) */}
        <div className="grid grid-cols-1 gap-4 border-b border-border py-8 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-5 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
              <Icon className="size-6 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            </div>
          ))}
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Image src={logo} alt="SNAPFIT" className="h-7 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Aksesori HP & tablet yang benar-benar pas. Pilih tipe, pesan,
              beres.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.newTab ? "_blank" : undefined}
                      rel={link.newTab ? "noopener noreferrer" : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SNAPFIT. Semua hak dilindungi.</p>
          <p>Dibuat di Indonesia.</p>
        </div>
      </div>
    </footer>
  );
}
