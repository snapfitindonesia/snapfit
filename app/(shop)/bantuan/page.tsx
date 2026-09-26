import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  RotateCcw,
  MessageCircle,
  Mail,
  ShoppingBag,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";

export const metadata = {
  title: "Bantuan",
  description:
    "Pusat bantuan SNAPFIT: cara pesan, pengiriman, pengembalian, dan cara menghubungi kami.",
};

const WA = "6285179779770";
const WA_LINK = `https://wa.me/${WA}?text=${encodeURIComponent("Halo SNAPFIT, saya mau bertanya:")}`;
const EMAIL = "snapfitindonesia@gmail.com";
const SHOPEE = "https://id.shp.ee/KcnkDw66";

const NAV = [
  { id: "cara-pesan", label: "Cara Pesan", icon: ShoppingCart },
  { id: "pengiriman", label: "Pengiriman", icon: Truck },
  { id: "pengembalian", label: "Pengembalian", icon: RotateCcw },
  { id: "hubungi", label: "Hubungi Kami", icon: MessageCircle },
];

const FAQ = [
  {
    q: "Produknya original?",
    a: "100% original. SNAPFIT adalah authorized reseller merek seperti Ringke, VRS, Araree, dan Supcase — bergaransi resmi.",
  },
  {
    q: "Bagaimana kalau tipe HP saya tidak ada?",
    a: "Chat WhatsApp kami. Banyak varian tipe belum tampil di web dan bisa kami cek stoknya untukmu.",
  },
  {
    q: "Bisa beli grosir / jadi reseller?",
    a: "Bisa. Lihat halaman Grosir Deadstock atau chat WhatsApp untuk penawaran harga grosir.",
  },
  {
    q: "Metode pembayaran apa saja?",
    a: "Transfer bank, e-wallet, kartu, dan QRIS melalui payment gateway aman (Midtrans) saat checkout di web.",
  },
];

export default function BantuanPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pusat Bantuan</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Semua yang perlu kamu tahu untuk belanja dengan tenang di SNAPFIT.
      </p>

      {/* Navigasi cepat */}
      <nav className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {NAV.map(({ id, label, icon: Icon }) => (
          <a
            key={id}
            href={`#${id}`}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center text-sm font-medium transition-colors hover:border-foreground hover:bg-muted/50"
          >
            <Icon className="size-5 text-brand" />
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-10 space-y-10 text-sm leading-relaxed text-foreground/90">
        {/* Cara Pesan */}
        <section id="cara-pesan" className="scroll-mt-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShoppingCart className="size-5 text-brand" /> Cara Pesan
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Cari produk lewat menu <Link href="/produk" className="font-medium text-brand hover:underline">Semua Produk</Link> atau kolom pencarian.</li>
            <li>Buka produk, pilih <b>tipe HP/tablet</b> dan varian (warna/model) yang sesuai.</li>
            <li>Klik <b>Tambah ke Keranjang</b>, lalu buka keranjang saat siap.</li>
            <li>Klik <b>Checkout</b>, isi alamat & data penerima. Ongkir dihitung otomatis.</li>
            <li>Bayar lewat metode pilihanmu. Pesanan diproses setelah pembayaran terkonfirmasi.</li>
          </ol>
          <p className="mt-3 text-muted-foreground">
            Sudah punya akun? Cek status di{" "}
            <Link href="/akun/pesanan" className="font-medium text-brand hover:underline">Pesanan Saya</Link>.
          </p>
        </section>

        {/* Pengiriman */}
        <section id="pengiriman" className="scroll-mt-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Truck className="size-5 text-brand" /> Pengiriman
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Pesanan dikirim melalui kurir tepercaya (JNE, J&T, SiCepat, dll.) sesuai pilihan saat checkout.</li>
            <li>Ongkos kirim dihitung otomatis berdasarkan alamat & berat paket.</li>
            <li>Pesanan diproses 1×24 jam kerja setelah pembayaran terkonfirmasi.</li>
            <li>Cek status & nomor resi kapan saja di <Link href="/lacak" className="font-medium text-brand hover:underline">Lacak Pesanan</Link> — cukup nomor pesanan + email/nomor HP, tanpa login.</li>
          </ul>
        </section>

        {/* Pengembalian */}
        <section id="pengembalian" className="scroll-mt-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <RotateCcw className="size-5 text-brand" /> Pengembalian & Garansi
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li><b>7 hari pengembalian</b> untuk produk cacat produksi atau salah kirim (barang belum dipakai, kelengkapan utuh).</li>
            <li>Semua produk <b>garansi resmi</b> dan <b>100% original</b>.</li>
            <li>Sebelum retur, chat WhatsApp kami dengan foto/video kondisi barang & nomor pesanan agar cepat kami bantu.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ShieldCheck className="size-4 text-brand" /> Garansi Resmi</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BadgeCheck className="size-4 text-brand" /> 100% Original</span>
          </div>
        </section>

        {/* Hubungi Kami */}
        <section id="hubungi" className="scroll-mt-24">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MessageCircle className="size-5 text-brand" /> Hubungi Kami
          </h2>
          <p className="mt-3 text-muted-foreground">Tim kami siap bantu setiap hari, jam 09.00–21.00 WIB.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground hover:bg-muted/50">
              <MessageCircle className="size-5 text-brand" />
              <span>
                <span className="block font-medium">WhatsApp</span>
                <span className="block text-xs text-muted-foreground">Respons tercepat</span>
              </span>
            </a>
            <a href={`mailto:${EMAIL}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground hover:bg-muted/50">
              <Mail className="size-5 text-brand" />
              <span>
                <span className="block font-medium">Email</span>
                <span className="block break-all text-xs text-muted-foreground">{EMAIL}</span>
              </span>
            </a>
            <a href={SHOPEE} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground hover:bg-muted/50">
              <ShoppingBag className="size-5 text-brand" />
              <span>
                <span className="block font-medium">Toko Shopee</span>
                <span className="block text-xs text-muted-foreground">Belanja via marketplace</span>
              </span>
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="scroll-mt-24">
          <h2 className="text-lg font-semibold text-foreground">Pertanyaan Umum</h2>
          <div className="mt-3 divide-y divide-border rounded-xl border border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-4 py-3">
                <summary className="cursor-pointer list-none font-medium marker:content-none">
                  <span className="flex items-center justify-between gap-2">
                    {f.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-2 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
