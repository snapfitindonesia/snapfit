import type { Metadata } from "next";
import { TrackOrder } from "@/components/shop/track-order";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description: "Cek status pesanan & nomor resi SNAPFIT Indonesia cukup dengan nomor pesanan dan email/nomor HP — tanpa perlu login.",
  alternates: { canonical: "/lacak" },
};

export default async function TrackPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-semibold tracking-tight">Lacak Pesanan</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Cek status & nomor resi pesananmu. Cukup nomor pesanan dan email/nomor HP yang dipakai saat checkout.
      </p>
      <div className="mt-6">
        <TrackOrder initialOrder={(order ?? "").slice(0, 60)} />
      </div>
    </div>
  );
}
