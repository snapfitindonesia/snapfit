"use client";

import { useEffect, useState } from "react";

// Countdown FOMO per-pengunjung: mulai hitung mundur saat pertama buka,
// tersimpan di localStorage (bertahan saat reload), dan otomatis mulai lagi
// begitu habis — supaya selalu terasa "hampir habis". Reset bila storage dibersihkan.
const KEY = "snapfit.promo.deadline";

const pad = (n: number) => String(n).padStart(2, "0");

export function EvergreenCountdown({
  minutes = 15,
  variant = "dark",
}: {
  minutes?: number;
  variant?: "dark" | "light" | "bar";
}) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const dur = minutes * 60 * 1000;
    let end: number;
    try {
      const stored = Number(localStorage.getItem(KEY));
      end = stored && stored > Date.now() ? stored : Date.now() + dur;
      localStorage.setItem(KEY, String(end));
    } catch {
      end = Date.now() + dur;
    }
    const tick = () => {
      let l = end - Date.now();
      if (l <= 0) {
        end = Date.now() + dur;
        try {
          localStorage.setItem(KEY, String(end));
        } catch {}
        l = dur;
      }
      setLeft(l);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [minutes]);

  const s = left == null ? 0 : Math.max(0, Math.floor(left / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const cells: [number, string][] = hh > 0 ? [[hh, "Jam"], [mm, "Menit"], [ss, "Detik"]] : [[mm, "Menit"], [ss, "Detik"]];

  // Varian ringkas untuk sticky bar (satu baris "MM:SS")
  if (variant === "bar") {
    return (
      <span className="rounded-md bg-brand px-2 py-0.5 font-bold tabular-nums text-brand-foreground">
        {left == null ? "--:--" : `${hh > 0 ? pad(hh) + ":" : ""}${pad(mm)}:${pad(ss)}`}
      </span>
    );
  }

  const box = variant === "dark" ? "bg-white/10 text-white" : "bg-foreground text-background";
  const lab = variant === "dark" ? "text-white/60" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Sisa waktu promo">
      {cells.map(([val, name], i) => (
        <div key={name} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <span className={`min-w-[2.6ch] rounded-lg px-2.5 py-1.5 text-center text-2xl font-bold tabular-nums ${box}`}>
              {left == null ? "--" : pad(val)}
            </span>
            <span className={`mt-1 text-[10px] uppercase tracking-wide ${lab}`}>{name}</span>
          </div>
          {i < cells.length - 1 && <span className="pb-4 text-2xl font-bold opacity-40">:</span>}
        </div>
      ))}
    </div>
  );
}
