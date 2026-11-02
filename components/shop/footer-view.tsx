import Link from "next/link";
import Image from "@/components/ui/image";
import { Plane, Headset, RotateCcw, ShieldCheck } from "lucide-react";
import logo from "@/logosnapfit.png";
import { cn } from "@/lib/utils";

export type FooterLink = { label: string; href: string; newTab?: boolean };
export type FooterColumn = { title: string; links: FooterLink[] };
/** Kolom bawaan; [0] = "Belanja" (halaman /buy1get1 menggantinya dengan menu promo). */
export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Belanja",
    links: [
      { label: "Semua Produk", href: "/produk" },
      { label: "Grosir Deadstock", href: "/grosir" },
      { label: "Kerja Sama Bisnis", href: "/bisnis" },
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
      { label: "Tentang", href: "/tentang" },
      { label: "Artikel", href: "/artikel" },
      { label: "Kebijakan Privasi", href: "/privacy" },
      { label: "Syarat & Ketentuan", href: "/terms" },
    ],
  },
];

const TRUST = [
  { icon: Plane, title: "Gratis Ongkir", desc: "Voucher ongkir s/d Rp20rb, min. belanja Rp150rb" },
  { icon: Headset, title: "Dukungan 24/7", desc: "Bantuan via WhatsApp tiap hari" },
  { icon: RotateCcw, title: "7 Hari Pengembalian", desc: "Retur mudah untuk produk cacat" },
  { icon: ShieldCheck, title: "100% Original", desc: "Produk resmi & bergaransi" },
];

/** Tampilan footer (tanpa data server) — dipakai juga halaman /buy1get1 (client).
 *  onLinkClick: true = tautan ditangani sendiri (mis. saringan ?kat= di halaman promo). */
export function FooterView({ columns, className, onLinkClick }: { columns: FooterColumn[]; className?: string; onLinkClick?: (href: string) => boolean }) {
  return (
    <footer className={cn("mt-24 border-t border-border", className)}>
      <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10">
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
            <Image src={logo} alt="SNAPFIT" unoptimized className="h-7 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              {/* Definisi merek (proper noun) — sama dengan /tentang & data terstruktur (lib/brand.ts). */}
              SNAPFIT adalah merek pelindung layar, pelindung kamera & casing smartphone presisi asal Indonesia.
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
                      onClick={onLinkClick ? (e) => { if (onLinkClick(link.href)) e.preventDefault(); } : undefined}
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

        <div className="flex flex-col items-center gap-1.5 border-t border-border py-6 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-left sm:text-sm">
          <p>© {new Date().getFullYear()} SNAPFIT. Semua hak dilindungi.</p>
          <p>
            Dibuat di D.I. Yogyakarta<span className="hidden sm:inline"> · </span>
            <br className="sm:hidden" />
            Powered by{" "}
            <a
              href="https://www.digitalinagency.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              DIGITALIN Marketing Agency
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
