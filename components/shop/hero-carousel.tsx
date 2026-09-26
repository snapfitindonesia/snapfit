"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  image: string;
  brand: string;
  caption: string;
  href: string;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  if (slides.length === 0) {
    return <div className="aspect-[4/3] w-full rounded-xl border border-border bg-muted" />;
  }

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, idx) => (
        <Link
          key={s.image}
          href={s.href}
          aria-hidden={idx !== i}
          inert={idx !== i}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            idx === i ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Image
            src={s.image}
            alt={`${s.brand} — ${s.caption}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-6"
            priority={idx === 0}
          />
          <span className="absolute left-4 top-4 rounded-full bg-background/85 px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur">
            {s.brand}
          </span>
          <span className="absolute bottom-4 left-4 max-w-[75%] rounded-md bg-foreground/85 px-3 py-1.5 text-sm font-medium text-background backdrop-blur">
            {s.caption}
          </span>
        </Link>
      ))}

      {/* Titik navigasi */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 right-4 z-10 flex gap-1.5">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Tampilkan slide ${idx + 1}`}
              aria-current={idx === i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-5 bg-foreground" : "w-1.5 bg-foreground/30 hover:bg-foreground/60",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
