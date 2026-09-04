import Link from "next/link";

// Strip promo tipis di paling atas (seperti Nomad). Ubah teks/link di sini.
export function AnnouncementBar() {
  return (
    <div className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-4 py-2 text-center text-xs font-medium sm:text-sm">
        Gratis ongkir min. Rp150rb ·{" "}
        <Link href="/produk" className="underline underline-offset-2">
          Belanja sekarang
        </Link>
      </div>
    </div>
  );
}
