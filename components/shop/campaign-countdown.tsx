"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Hitung mundur ke waktu NYATA (mulai/berakhirnya kampanye) — beda dengan
 * EvergreenCountdown (grosir) yang berulang. Habis → muat ulang data halaman.
 */
export function CampaignCountdown({ target, label }: { target: string; label: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null); // null = belum mount (hindari beda SSR/klien)

  useEffect(() => {
    const end = new Date(target).getTime();
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      return ms;
    };
    tick();
    const t = setInterval(() => {
      if (tick() === 0) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target, router]);

  const s = Math.floor((left ?? 0) / 1000);
  const cells: [string, string][] = [
    [String(Math.floor(s / 86400)), "Hari"],
    [pad(Math.floor((s % 86400) / 3600)), "Jam"],
    [pad(Math.floor((s % 3600) / 60)), "Menit"],
    [pad(s % 60), "Detik"],
  ];

  return (
    <div role="timer" aria-label={label}>
      <p className="text-xs font-medium uppercase tracking-wide text-background/70">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        {cells.map(([v, name]) => (
          <div key={name} className="flex min-w-14 flex-col items-center rounded-lg bg-white/10 px-2.5 py-2">
            <span className="text-2xl font-bold tabular-nums">{left == null ? "--" : v}</span>
            <span className="text-[10px] uppercase tracking-wide text-background/70">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
