import type { Metadata } from "next";
import { NotFoundContent } from "@/components/shop/not-found-content";

export const metadata: Metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

// 404 di dalam toko (header, footer & keranjang tetap ada).
export default function ShopNotFound() {
  return <NotFoundContent />;
}
