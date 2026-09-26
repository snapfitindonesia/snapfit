"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { MainBanner } from "@/lib/actions/product";

const KEY = "snapfit.popup.v1";
const SIX_HOURS = 6 * 60 * 60 * 1000;

/**
 * Popup banner (1000×1000) saat pengunjung masuk — tampil sekali per 6 jam
 * (disimpan di localStorage per-perangkat). Dikelola di Admin → Banner (POPUP).
 */
export function PopupBanner({ banner }: { banner: MainBanner | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!banner) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(KEY) || 0);
    } catch {
      last = 0;
    }
    if (Date.now() - last < SIX_HOURS) return; // sudah tampil dalam 6 jam terakhir

    // Tampil setelah pengunjung mulai scroll (atau 15 dtk) — BUKAN langsung saat
    // halaman dibuka: popup instan menutupi konten, dihitung Google sebagai LCP
    // (skor kecepatan anjlok) & dinilai "intrusive interstitial" di mobile.
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      cleanup();
      setOpen(true);
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        // abaikan bila storage tak tersedia
      }
    };
    const onScroll = () => {
      if (window.scrollY > 300) show();
    };
    const t = setTimeout(show, 15_000);
    function cleanup() {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [banner]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!banner || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Promo"
    >
      <div
        className="relative w-full max-w-md animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup"
          className="absolute -right-2 -top-2 z-10 grid size-9 place-items-center rounded-full bg-background text-foreground shadow-lg ring-1 ring-border transition-transform hover:scale-105"
        >
          <X className="size-5" />
        </button>
        <Link href={banner.href} onClick={() => setOpen(false)} className="block overflow-hidden rounded-2xl shadow-2xl">
          <Image
            src={banner.image}
            alt="Promo"
            width={1000}
            height={1000}
            sizes="(max-width: 640px) 90vw, 448px"
            className="h-auto w-full object-cover"
            priority
          />
        </Link>
      </div>
    </div>
  );
}
