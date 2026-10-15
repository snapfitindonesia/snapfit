"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useStoreUI } from "@/components/shop/store-ui-provider";

const KEY = "snapfit.isAdmin";

/**
 * Tombol "Edit produk" — HANYA untuk admin yang sedang login. Halaman produk di-cache sama untuk semua
 * pengunjung, jadi dicek di browser: pengunjung tanpa sesi login tak memicu permintaan apa pun; yang login
 * dicek sekali per sesi tab ke /api/admin/me (hasil disimpan di sessionStorage).
 */
export function AdminEditLink({ productId, className = "" }: { productId: string; className?: string }) {
  const { authed } = useStoreUI();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!authed) {
      setAdmin(false);
      try { sessionStorage.removeItem(KEY); } catch {}
      return;
    }
    let cached: string | null = null;
    try { cached = sessionStorage.getItem(KEY); } catch {}
    if (cached !== null) {
      setAdmin(cached === "1");
      return;
    }
    let alive = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { admin: false }))
      .then((d: { admin?: boolean }) => {
        if (!alive) return;
        setAdmin(!!d.admin);
        try { sessionStorage.setItem(KEY, d.admin ? "1" : "0"); } catch {}
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [authed]);

  if (!admin) return null;
  return (
    <a
      href={`/admin/produk/${productId}`}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground ${className}`}
      title="Buka produk ini di panel admin (tab baru)"
    >
      <Pencil className="size-3.5" aria-hidden /> Edit produk
    </a>
  );
}
