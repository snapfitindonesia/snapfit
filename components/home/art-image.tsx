import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { directLoaderFor } from "@/lib/image-loader";
import { cn } from "@/lib/utils";

/**
 * Foto `fill` dengan versi HP opsional (<picture>: ≥768px pakai `src`, di bawahnya `srcMobile`)
 * — hanya SATU yang diunduh browser. Loader sama dengan components/ui/image.tsx: foto CDN
 * langsung (varian ukuran), termasuk `priority` (hemat kuota Image Optimization Vercel).
 * Server component (tanpa JS di browser).
 *
 * `priority` (foto hero = elemen LCP): getImageProps TIDAK menambahkan preload/fetchpriority, jadi
 * dulu foto hero antre di belakang ±150 KB JavaScript di HP (LCP ±3,8 dtk). Sekarang: <link rel=preload>
 * per ukuran layar (media query → HP & desktop masing-masing hanya mengunduh fotonya) + fetchpriority=high.
 */
export function ArtImage({
  src,
  srcMobile,
  alt,
  sizes = "100vw",
  priority = false,
  className,
}: {
  src: string;
  srcMobile?: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const propsFor = (s: string) => {
    const loader = directLoaderFor(s); // termasuk priority (hemat kuota Vercel, lihat components/ui/image.tsx)
    return getImageProps({ src: s, alt, fill: true, sizes, priority, ...(loader ? { loader } : {}) }).props;
  };
  const hint = (p: ReturnType<typeof propsFor>, media?: string) => {
    if (!priority) return;
    preload(p.src, { as: "image", imageSrcSet: p.srcSet, imageSizes: p.sizes, fetchPriority: "high", ...(media ? { media } : {}) });
  };
  const desk = propsFor(src);
  const cls = cn("object-cover", className);
  const eager = priority ? ({ fetchPriority: "high", loading: "eager" } as const) : {};
  if (!srcMobile || srcMobile === src) {
    hint(desk);
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props dari getImageProps (alt ada)
    return <img {...desk} {...eager} className={cls} />;
  }
  const mob = propsFor(srcMobile);
  hint(mob, "(max-width: 767px)");
  hint(desk, "(min-width: 768px)");
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desk.srcSet} sizes={desk.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- props dari getImageProps (alt ada) */}
      <img {...mob} {...eager} className={cls} />
    </picture>
  );
}
