"use client";

import NextImage, { type ImageProps } from "next/image";
import { directLoaderFor, isOwnCdn } from "@/lib/image-loader";

/**
 * next/image + foto langsung dari CDN (hemat kuota Vercel). Lihat lib/image-loader.ts.
 * Pengecualian: foto `priority` (banner pertama, 4 kartu teratas, foto utama PDP) dari
 * cdn.snapfit.id tetap lewat /_next/image — satu domain dengan halaman, jadi elemen
 * LCP tak menunggu koneksi baru (DNS+TLS) di HP. Jumlahnya kecil → kuota aman.
 */
export default function Image(props: ImageProps) {
  const src = typeof props.src === "string" ? props.src : null;
  const loader = src && !(props.priority && isOwnCdn(src)) ? directLoaderFor(src) : null;
  return <NextImage {...props} {...(loader ? { loader } : {})} />;
}
