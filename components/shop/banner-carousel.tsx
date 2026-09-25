"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Banner = { id: string; image: string; href: string };

// Banner besar landscape (rasio 2:1, ideal 1200×600) — bisa slide + link.
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // Geser (swipe) untuk mobile — pengganti panah yang disembunyikan.
  const [touchX, setTouchX] = useState<number | null>(null);
  const n = banners.length;

  useEffect(() => {
    if (paused || n < 2) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => clearInterval(t);
  }, [paused, n]);

  if (n === 0) return null;

  const go = (d: number) => setI((v) => (v + d + n) % n);

  const onTouchEnd = (endX: number) => {
    if (touchX === null) return;
    const dx = endX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    setTouchX(null);
  };

  return (
    <div
      className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl border border-border bg-muted"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
      onTouchEnd={(e) => onTouchEnd(e.changedTouches[0].clientX)}
    >
      {banners.map((b, idx) => (
        <Link
          key={b.id}
          href={b.href}
          aria-hidden={idx !== i}
          tabIndex={idx === i ? 0 : -1}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            idx === i ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <Image
            src={b.image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 1200px"
            className="object-cover"
            priority={idx === 0}
          />
        </Link>
      ))}

      {n > 1 && (
        <>
          {/* Panah */}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Sebelumnya"
            className="absolute left-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition-colors hover:bg-background sm:grid"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Berikutnya"
            className="absolute right-3 top-1/2 z-10 hidden size-9 -translate-y-1/2 place-items-center rounded-full bg-background/80 text-foreground shadow backdrop-blur transition-colors hover:bg-background sm:grid"
          >
            <ChevronRight className="size-5" />
          </button>

          {/* Titik */}
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                aria-current={idx === i}
                className={cn(
                  "h-2 rounded-full transition-all",
                  idx === i ? "w-6 bg-background" : "w-2 bg-background/50 hover:bg-background/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
