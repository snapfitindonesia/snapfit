"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Palette,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };
type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

// Menu admin: grup utama → sub-menu. Urutan = yang paling sering dipakai dulu.
const GROUPS: NavGroup[] = [
  {
    id: "penjualan",
    label: "Penjualan",
    icon: ShoppingBag,
    items: [
      { href: "/admin/pesanan", label: "Pesanan" },
      { href: "/admin/keranjang", label: "Keranjang Ditinggal" },
      { href: "/admin/ongkir", label: "Ongkir per Provinsi" },
      { href: "/admin/voucher", label: "Voucher" },
      { href: "/admin/diskon", label: "Diskon" },
    ],
  },
  {
    id: "katalog",
    label: "Katalog",
    icon: Package,
    items: [
      { href: "/admin/produk", label: "Semua Produk" },
      { href: "/admin/produk/baru", label: "Tambah Produk" },
      { href: "/admin/produk/edit-massal", label: "Edit Massal" },
      { href: "/admin/produk/impor", label: "Impor CSV" },
      { href: "/admin/ginee/impor", label: "Impor Ginee" },
      { href: "/admin/unggulan", label: "Unggulan" },
      { href: "/admin/kategori", label: "Kategori" },
      { href: "/admin/merek", label: "Merek" },
    ],
  },
  {
    id: "tampilan",
    label: "Tampilan Toko",
    icon: Palette,
    items: [
      { href: "/admin/banner", label: "Banner" },
      { href: "/admin/menu", label: "Menu Header" },
      { href: "/admin/overview", label: "Overview Produk" },
      { href: "/admin/linktree", label: "Linktree" },
    ],
  },
  {
    id: "pelanggan",
    label: "Pelanggan",
    icon: MessagesSquare,
    items: [
      { href: "/admin/ulasan", label: "Ulasan" },
      { href: "/admin/pencarian", label: "Pencarian" },
    ],
  },
];

const ALL_HREFS = GROUPS.flatMap((g) => g.items.map((i) => i.href));
const STORAGE_KEY = "snapfit.admin.nav.open";

/** Sub-menu aktif = href terpanjang yang cocok (mis. /admin/produk/baru ≠ Semua Produk). */
function activeHref(pathname: string): string | null {
  const hits = ALL_HREFS.filter((h) => pathname === h || pathname.startsWith(`${h}/`));
  return hits.sort((a, b) => b.length - a.length)[0] ?? null;
}

export function AdminNav() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const currentGroup = GROUPS.find((g) => g.items.some((i) => i.href === current))?.id;

  // Grup terbuka: diingat di browser; grup halaman aktif selalu terbuka.
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentGroup ? [currentGroup] : []));
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) setOpen(new Set([...saved, ...(currentGroup ? [currentGroup] : [])]));
    } catch {
      // abaikan storage yang tak tersedia
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (currentGroup) setOpen((s) => (s.has(currentGroup) ? s : new Set(s).add(currentGroup)));
  }, [currentGroup]);

  function toggle(id: string) {
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // abaikan
      }
      return next;
    });
  }

  const linkCls = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
      active ? "bg-brand/10 font-medium text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav className="flex flex-col gap-1" aria-label="Menu admin">
      <Link href="/admin" className={linkCls(pathname === "/admin")} aria-current={pathname === "/admin" ? "page" : undefined}>
        <LayoutDashboard className="size-[18px]" />
        Dashboard
      </Link>

      {GROUPS.map(({ id, label, icon: Icon, items }) => {
        const isOpen = open.has(id);
        const hasActive = id === currentGroup;
        return (
          <div key={id} className="mt-1">
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={isOpen}
              aria-controls={`nav-${id}`}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                hasActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-[18px]" />
              <span className="flex-1 text-left">{label}</span>
              <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
            </button>
            {isOpen && (
              <ul id={`nav-${id}`} className="ml-[21px] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                {items.map((item) => {
                  const active = item.href === current;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                          active ? "bg-brand/10 font-medium text-brand-ink" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
