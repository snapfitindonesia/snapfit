import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = { title: "Halaman tidak ditemukan", robots: { index: false } };

// Tangkap semua URL yang tak cocok dengan rute mana pun → 404 toko (app/(shop)/not-found.tsx)
// agar tampil dengan header & footer. Rute yang ada (statis/dinamis) tetap didahulukan Next.
export default function MissingPage() {
  notFound();
}
