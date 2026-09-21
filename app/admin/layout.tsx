import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

// Proteksi (login + role admin + MFA) ditegakkan di middleware.ts (fail-closed).
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Sidebar kiri (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight">SNAPFIT Admin</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <AdminNav />
        </div>
        <div className="border-t border-border p-3">
          {user?.email && (
            <p className="truncate px-2 pb-2 text-xs text-muted-foreground">{user.email}</p>
          )}
          <SignOutButton />
        </div>
      </aside>

      {/* Header atas (mobile) — menu jadi drawer yang bisa dibuka/tutup */}
      <header className="sticky top-0 z-30 border-b border-border bg-card lg:hidden">
        <div className="flex h-14 items-center gap-2 px-3">
          <AdminMobileNav email={user?.email} />
          <Link href="/admin" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">
              S
            </span>
            <span className="text-sm font-semibold">SNAPFIT Admin</span>
          </Link>
        </div>
      </header>

      {/* Konten */}
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
