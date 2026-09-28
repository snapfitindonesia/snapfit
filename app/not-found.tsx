import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/image";
import logo from "@/logosnapfit.png";
import { NotFoundContent } from "@/components/shop/not-found-content";

export const metadata: Metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

// Cadangan di luar toko (mis. panel admin). URL toko ditangani app/(shop)/not-found.tsx.
export default function RootNotFound() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-[100rem] items-center px-4 lg:px-10">
          <Link href="/" aria-label="SNAPFIT — beranda">
            <Image src={logo} alt="SNAPFIT" className="h-6 w-auto sm:h-7" />
          </Link>
        </div>
      </header>
      <NotFoundContent />
    </div>
  );
}
