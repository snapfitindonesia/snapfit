import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, BadgeCheck, RotateCcw } from "lucide-react";
import logo from "@/logosnapfit.png";

const COLUMNS = [
  {
    title: "Belanja",
    links: [
      { label: "Semua Produk", href: "/produk" },
      { label: "iPhone", href: "/produk?tipe=iphone" },
      { label: "Samsung", href: "/produk?tipe=samsung" },
      { label: "iPad & Tablet", href: "/produk?tipe=tablet" },
    ],
  },
  {
    title: "Bantuan",
    links: [
      { label: "Cara Pesan", href: "#" },
      { label: "Pengiriman", href: "#" },
      { label: "Pengembalian", href: "#" },
      { label: "Hubungi Kami", href: "#" },
    ],
  },
  {
    title: "SnapFit",
    links: [
      { label: "Tentang", href: "#" },
      { label: "Garansi", href: "#" },
      { label: "Kebijakan Privasi", href: "#" },
    ],
  },
];

const TRUST = [
  { icon: ShieldCheck, label: "Garansi Resmi" },
  { icon: BadgeCheck, label: "100% Original" },
  { icon: RotateCcw, label: "7 Hari Pengembalian" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Trust strip */}
        <div className="grid grid-cols-1 gap-4 border-b border-border py-8 sm:grid-cols-3">
          {TRUST.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="size-5 text-foreground" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-8 py-12 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Image src={logo} alt="SnapFit" className="h-7 w-auto" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Aksesori HP & tablet yang benar-benar pas. Pilih tipe, pesan,
              beres.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-medium">{col.title}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
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
          <p>© {new Date().getFullYear()} SnapFit. Semua hak dilindungi.</p>
          <p>Dibuat di Indonesia.</p>
        </div>
      </div>
    </footer>
  );
}
