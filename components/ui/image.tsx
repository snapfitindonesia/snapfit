"use client";

import NextImage, { type ImageProps } from "next/image";
import { directLoaderFor } from "@/lib/image-loader";

/**
 * next/image + foto langsung dari CDN (hemat kuota Vercel). Lihat lib/image-loader.ts.
 * Termasuk foto `priority`: dulu foto priority dari cdn.snapfit.id lewat /_next/image (satu
 * domain → LCP tanpa koneksi baru), tapi 177 PDP × beberapa lebar layar menghabiskan kuota
 * 5.000 transformasi/bln (Sep 2026). Koneksi ke CDN dibuka dini lewat preconnect di app/layout.tsx.
 */
export default function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  const loader = src ? directLoaderFor(src) : null;
  return <NextImage {...props} {...(loader ? { loader } : {})} />;
}
