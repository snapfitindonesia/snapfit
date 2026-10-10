"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * Link yang TIDAK mem-prefetch saat terlihat di layar — hanya saat disentuh/hover (niat buka).
 * Grid produk menampilkan puluhan kartu: prefetch otomatis tiap kartu = puluhan render ISR halaman produk
 * (kuota Vercel & query database) untuk halaman yang kebanyakan tak pernah dibuka.
 */
export function HoverPrefetchLink({ href, onMouseEnter, onTouchStart, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => { prefetch(); onMouseEnter?.(e); }}
      onTouchStart={(e) => { prefetch(); onTouchStart?.(e); }}
      {...props}
    />
  );
}
