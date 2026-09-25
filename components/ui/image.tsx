"use client";

import NextImage, { type ImageProps } from "next/image";
import { directLoaderFor } from "@/lib/image-loader";

/** next/image + foto marketplace langsung dari CDN-nya (hemat kuota Vercel). Lihat lib/image-loader.ts. */
export default function Image(props: ImageProps) {
  const loader = typeof props.src === "string" ? directLoaderFor(props.src) : null;
  return <NextImage {...props} {...(loader ? { loader } : {})} />;
}
