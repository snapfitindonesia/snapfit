"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Baris geser ke samping (scroll-snap CSS). Tombol panah hanya di desktop — di HP cukup
 * digeser jari. Tanpa library carousel: JS minimal.
 */
export function ScrollRow({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <div className="group/row relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] sm:gap-5 [&::-webkit-scrollbar]:hidden",
          className,
        )}
      >
        {children}
      </div>
      {(
        [
          [-1, "left-3 lg:left-6", ChevronLeft, "Geser ke kiri"],
          [1, "right-3 lg:right-6", ChevronRight, "Geser ke kanan"],
        ] as const
      ).map(([dir, pos, Icon, aria]) => (
        <button
          key={dir}
          type="button"
          onClick={() => go(dir)}
          aria-label={aria}
          className={cn(
            "absolute top-[40%] z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/95 shadow-sm transition-opacity hover:bg-background md:grid md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100",
            pos,
          )}
        >
          <Icon className="size-5" />
        </button>
      ))}
    </div>
  );
}
