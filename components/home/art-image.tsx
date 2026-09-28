import { getImageProps } from "next/image";
import { directLoaderFor, isOwnCdn } from "@/lib/image-loader";
import { cn } from "@/lib/utils";

/**
 * Foto `fill` dengan versi HP opsional (<picture>: ≥768px pakai `src`, di bawahnya `srcMobile`)
 * — hanya SATU yang diunduh browser. Loader sama dengan components/ui/image.tsx: foto CDN
 * langsung (varian ukuran), kecuali `priority` dari cdn.snapfit.id → /_next/image (LCP).
 * Server component (tanpa JS di browser).
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
    const loader = !(priority && isOwnCdn(s)) ? directLoaderFor(s) : null;
    return getImageProps({ src: s, alt, fill: true, sizes, priority, ...(loader ? { loader } : {}) }).props;
  };
  const desk = propsFor(src);
  const cls = cn("object-cover", className);
  if (!srcMobile || srcMobile === src) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props dari getImageProps (alt ada)
    return <img {...desk} className={cls} />;
  }
  const mob = propsFor(srcMobile);
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desk.srcSet} sizes={desk.sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- props dari getImageProps (alt ada) */}
      <img {...mob} className={cls} />
    </picture>
  );
}
