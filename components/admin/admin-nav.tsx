"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Image as ImageIcon,
  Percent,
  Ticket,
  ShoppingBag,
  DownloadCloud,
  FolderTree,
} from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/produk", label: "Produk", icon: Package },
  { href: "/admin/kategori", label: "Kategori", icon: FolderTree },
  { href: "/admin/ginee/impor", label: "Impor Ginee", icon: DownloadCloud },
  { href: "/admin/banner", label: "Banner", icon: ImageIcon },
  { href: "/admin/diskon", label: "Diskon", icon: Percent },
  { href: "/admin/voucher", label: "Voucher", icon: Ticket },
  { href: "/admin/pesanan", label: "Pesanan", icon: ShoppingBag },
];

export function AdminNav({ orientation = "vertical" }: { orientation?: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  if (orientation === "horizontal") {
    return (
      <nav className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                active ? "bg-brand/10 font-medium text-brand" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-brand/10 font-medium text-brand"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-[18px]" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
