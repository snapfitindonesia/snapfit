"use client";

import { useState } from "react";
import NextImage, { type ImageProps } from "next/image";
import { directLoaderFor } from "@/lib/image-loader";

/** Pengganti saat foto kosong / URL tak valid / gagal dimuat (kotak abu-abu bergambar ikon foto). */
export const FALLBACK_IMAGE = "/foto-kosong.svg";

/** URL foto yang aman untuk next/image: kosong, tanpa skema (mis. "x") atau protokol aneh → foto pengganti. */
function safeSrc(src: ImageProps["src"]): ImageProps["src"] {
  if (typeof src !== "string") return src;
  const s = src.trim();
  if (!s) return FALLBACK_IMAGE;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    const u = new URL(s);
    if (u.protocol === "https:" || u.protocol === "http:") return s;
  } catch {
    // bukan URL
  }
  return FALLBACK_IMAGE;
}

/**
 * next/image + foto langsung dari CDN (hemat kuota Image Optimization Vercel). Lihat lib/image-loader.ts.
 * Tahan banting: URL foto rusak (data lama di keranjang/localStorage, impor) dulu membuat next/image melempar
 * error → SELURUH halaman (mis. checkout) jadi "Halaman gagal dimuat". Kini diganti foto pengganti, termasuk
 * bila foto gagal diunduh (404).
 */
export default function Image(props: ImageProps) {
  const [failed, setFailed] = useState(false);
  const src = failed ? FALLBACK_IMAGE : safeSrc(props.src);
  const str = typeof src === "string" ? src : null;
  const loader = str && str !== FALLBACK_IMAGE ? directLoaderFor(str) : null;
  return (
    <NextImage
      {...props}
      src={src}
      {...(loader ? { loader } : {})}
      {...(str === FALLBACK_IMAGE ? { unoptimized: true } : {})}
      onError={(e) => {
        if (!failed) setFailed(true);
        props.onError?.(e);
      }}
    />
  );
}
