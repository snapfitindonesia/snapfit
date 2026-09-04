import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";

// Proteksi (login + role admin + MFA) ditegakkan di middleware.ts (fail-closed).
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            SnapFit Admin
          </Link>
          <nav className="hidden gap-4 text-sm text-muted-foreground sm:flex">
            <Link href="/admin/produk" className="hover:text-foreground">Produk</Link>
            <Link href="/admin/banner" className="hover:text-foreground">Banner</Link>
            <Link href="/admin/diskon" className="hover:text-foreground">Diskon</Link>
            <Link href="/admin/voucher" className="hover:text-foreground">Voucher</Link>
            <Link href="/admin/pesanan" className="hover:text-foreground">Pesanan</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {user?.email && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.email}
              </span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
