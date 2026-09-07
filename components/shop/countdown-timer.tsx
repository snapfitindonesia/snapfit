"use client";

import { useEffect, useState } from "react";

// Countdown JUJUR: menghitung mundur ke timestamp nyata (endsAt).
// Saat lewat → memanggil onExpire & menampilkan "Promo berakhir" (tidak reset diam-diam).

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function CountdownTimer({
  endsAt,
  variant = "light",
}: {
  endsAt: string; // ISO, mis. "2026-09-14T23:59:59+07:00"
  variant?: "light" | "dark";
}) {
  const target = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const left = now == null ? target - Date.now() : target - now;
  const expired = left <= 0;
  const { d, h, m, s } = parts(left);

  const box =
    variant === "dark"
      ? "bg-white/10 text-white"
      : "bg-foreground text-background";
  const label = variant === "dark" ? "text-white/70" : "text-muted-foreground";

  if (expired) {
    return (
      <span className={variant === "dark" ? "text-sm font-medium text-white/80" : "text-sm font-medium text-muted-foreground"}>
        Promo sudah berakhir.
      </span>
    );
  }

  const cells: [number, string][] = [
    [d, "Hari"],
    [h, "Jam"],
    [m, "Menit"],
    [s, "Detik"],
  ];

  return (
    <div className="flex items-center gap-1.5" role="timer" aria-label="Sisa waktu promo">
      {cells.map(([val, name], i) => (
        <div key={name} className="flex items-center gap-1.5">
          <div className="flex flex-col items-center">
            <span className={`min-w-[2.5ch] rounded-md px-2 py-1 text-center text-lg font-bold tabular-nums ${box}`}>
              {now == null ? "--" : pad(val)}
            </span>
            <span className={`mt-1 text-[10px] uppercase tracking-wide ${label}`}>{name}</span>
          </div>
          {i < cells.length - 1 && <span className="pb-4 text-lg font-bold opacity-40">:</span>}
        </div>
      ))}
    </div>
  );
}
