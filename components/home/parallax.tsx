"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Lapisan latar parallax: isi (foto dari server) bergeser lebih lambat dari scroll.
 * - Lapisan dibuat 24% lebih tinggi dari bagiannya agar pergeseran tak memperlihatkan tepi.
 * - Hanya bekerja saat bagian terlihat (IntersectionObserver) + requestAnimationFrame.
 * - Mati untuk "kurangi gerakan" (prefers-reduced-motion) & bila `enabled` false.
 * Foto tetap dirender di server → tak menunda tampilan pertama (LCP).
 */
export function Parallax({
  children,
  enabled = true,
  speed = 0.25,
  className,
}: {
  children: React.ReactNode;
  enabled?: boolean;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const host = el?.parentElement;
    if (!enabled || !el || !host) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      const r = host.getBoundingClientRect();
      // 0 saat bagian tepat di atas layar; bergerak sebanding posisi scroll relatif bagian.
      const shift = Math.max(-r.height * 0.12, Math.min(r.height * 0.12, -r.top * speed));
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
    };
    const onScroll = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) onScroll();
    });
    io.observe(host);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, speed]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("absolute inset-x-0 -z-10 will-change-transform", enabled ? "-top-[12%] -bottom-[12%]" : "inset-y-0", className)}
    >
      {children}
    </div>
  );
}
