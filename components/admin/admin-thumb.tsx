"use client";

import NextImage from "next/image";
import { directLoaderFor } from "@/lib/image-loader";

/**
 * Thumbnail kecil di tabel admin. Foto CDN kita → varian .w128 (±5 KB, bukan file asli ±150 KB);
 * marketplace → ukuran kecil bawaan CDN-nya; host lain → apa adanya (tak memakai kuota optimasi Vercel).
 */
export function AdminThumb({ src, size = 48, className }: { src: string | null | undefined; size?: number; className?: string }) {
  if (!src) return <div className={className} />;
  const loader = directLoaderFor(src);
  return (
    <NextImage
      src={src}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      loading="lazy"
      {...(loader ? { loader } : { unoptimized: true })}
      className={className}
    />
  );
}
