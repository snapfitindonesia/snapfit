import Image from "@/components/ui/image";
import Link from "next/link";
import type { MainBanner } from "@/lib/actions/product";

/** 2 banner kotak (1000×1000) berdampingan, tiap slot bisa di-klik. */
export function PromoBanners({ banners }: { banners: MainBanner[] }) {
  if (banners.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
      {banners.map((b) => (
        <Link
          key={b.id}
          href={b.href}
          className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-muted"
        >
          <Image src={b.image} alt="" fill sizes="(max-width:640px) 100vw, 600px" className="object-cover transition-transform duration-500 hover:scale-105" />
        </Link>
      ))}
    </div>
  );
}

/** Banner strip panjang (mis. 2000×400) full-width — mengikuti rasio gambar. */
export function StripBanner({ banner }: { banner: MainBanner | null }) {
  if (!banner) return null;
  return (
    <Link href={banner.href} className="block overflow-hidden rounded-xl border border-border">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.image} alt="" loading="lazy" decoding="async" className="h-auto w-full object-cover" />
    </Link>
  );
}
