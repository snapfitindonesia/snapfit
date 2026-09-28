import Link from "next/link";

// Strip promo tipis di paling atas (seperti Nomad). Tinggi tetap satu baris (--announce-h) agar hero
// full-bleed di beranda bisa "masuk" ke belakangnya; di atas hero foto, bar jadi transparan
// (styles/globals.css → html:has([data-hero-overlay])). Ubah teks/link di sini.
export function AnnouncementBar() {
  return (
    <div data-announce className="relative z-30 flex h-(--announce-h) items-center bg-foreground text-background">
      <div className="mx-auto w-full max-w-[100rem] truncate px-4 text-center text-xs font-semibold sm:text-sm lg:px-10">
        <span className="sm:hidden">Voucher ongkir s/d Rp20rb ·{" "}</span>
        <span className="hidden sm:inline">Voucher GRATISONGKIR: potongan ongkir s/d Rp20rb, min. belanja Rp150rb ·{" "}</span>
        <Link href="/produk" className="underline underline-offset-2">
          Belanja sekarang
        </Link>
      </div>
    </div>
  );
}
