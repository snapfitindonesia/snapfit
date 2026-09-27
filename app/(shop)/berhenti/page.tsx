import Link from "next/link";
import { redirect } from "next/navigation";
import { optOutReminders } from "@/lib/actions/cart-draft";

export const metadata = {
  title: "Berhenti pengingat",
  robots: { index: false, follow: false },
};

// Dari tautan "Berhenti" di email pengingat keranjang. Perlu klik tombol
// (bukan otomatis saat dibuka) agar pemindai tautan email tak memicunya.
export default async function BerhentiPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; ok?: string }>;
}) {
  const { t = "", ok } = await searchParams;

  async function confirm() {
    "use server";
    const res = await optOutReminders(t);
    redirect(res.ok ? "/berhenti?ok=1" : `/berhenti?t=${encodeURIComponent(t)}&ok=0`);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="text-xl font-semibold tracking-tight">Pengingat keranjang</h1>
      {ok === "1" ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Beres. Kamu tidak akan menerima email pengingat keranjang lagi. Email pesanan (konfirmasi, pengiriman) tetap dikirim.
        </p>
      ) : ok === "0" || !t ? (
        <p className="mt-3 text-sm text-muted-foreground">Tautan tidak valid. Balas email kami bila ingin berhenti menerima pengingat.</p>
      ) : (
        <form action={confirm} className="mt-4">
          <p className="text-sm text-muted-foreground">Berhenti menerima email pengingat saat checkout belum selesai?</p>
          <button type="submit" className="mt-5 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
            Ya, berhenti
          </button>
        </form>
      )}
      <Link href="/" className="mt-8 inline-block text-sm font-medium underline underline-offset-4">
        Kembali ke toko
      </Link>
    </main>
  );
}
