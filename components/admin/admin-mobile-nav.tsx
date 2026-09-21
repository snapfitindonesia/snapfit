"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AdminMobileNav({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Tutup drawer saat pindah halaman.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Kunci scroll body saat drawer terbuka.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-foreground hover:bg-muted"
        aria-label="Buka menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Overlay + drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col bg-card shadow-xl">
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-xs font-bold text-brand-foreground">S</span>
              <span className="text-sm font-semibold">SNAPFIT Admin</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Tutup"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <AdminNav />
            </div>
            <div className="border-t border-border p-3">
              {email && <p className="truncate px-2 pb-2 text-xs text-muted-foreground">{email}</p>}
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
