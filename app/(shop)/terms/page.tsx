import Link from "next/link";

export const metadata = {
  title: "Syarat & Ketentuan — SNAPFIT",
  description: "Syarat dan ketentuan penggunaan situs serta pembelian di SNAPFIT.",
};

const UPDATED = "22 September 2026";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Syarat &amp; Ketentuan</h1>
      <p className="mt-2 text-sm text-muted-foreground">Terakhir diperbarui: {UPDATED}</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p>
          Dengan mengakses dan menggunakan situs SNAPFIT (dikelola oleh SNAPFIT Indonesia), Anda
          menyetujui syarat dan ketentuan berikut. Mohon dibaca sebelum berbelanja.
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Akun</h2>
          <p className="mt-2">Anda bertanggung jawab menjaga kerahasiaan akun dan password Anda. Aktivitas yang terjadi melalui akun Anda menjadi tanggung jawab Anda. Beri tahu kami bila ada penggunaan tanpa izin.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Produk, Harga &amp; Stok</h2>
          <p className="mt-2">Kami berupaya menampilkan informasi produk seakurat mungkin. Harga dan ketersediaan stok dapat berubah sewaktu-waktu tanpa pemberitahuan. Warna produk pada foto dapat sedikit berbeda karena pencahayaan/layar.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Pesanan &amp; Pembayaran</h2>
          <p className="mt-2">Pesanan dianggap sah setelah pembayaran terkonfirmasi melalui metode pembayaran yang tersedia. Kami berhak menolak atau membatalkan pesanan bila terdapat kesalahan harga, kecurangan, atau stok tidak tersedia.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Pengiriman</h2>
          <p className="mt-2">Pesanan dikirim melalui jasa kurir ke alamat yang Anda berikan. Estimasi waktu pengiriman bersifat perkiraan dan dapat dipengaruhi faktor di luar kendali kami. Pastikan alamat &amp; nomor telepon benar.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Pengembalian &amp; Garansi</h2>
          <p className="mt-2">Kami menerima pengembalian dalam <b>7 hari</b> bila produk tidak sesuai atau cacat dari pabrik, dengan kondisi dan kelengkapan seperti saat diterima. Semua produk kami <b>100% original</b>. Hubungi kami lebih dulu sebelum melakukan pengembalian.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Hak Kekayaan Intelektual</h2>
          <p className="mt-2">Nama, logo, dan konten di situs ini milik SNAPFIT atau pemiliknya masing-masing. Merek pihak ketiga (mis. Ringke, VRS, Spigen) adalah milik pemegang mereknya; kami menjual produk resmi mereka sebagai reseller.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Batasan Tanggung Jawab</h2>
          <p className="mt-2">Sejauh diizinkan hukum, SNAPFIT tidak bertanggung jawab atas kerugian tidak langsung yang timbul dari penggunaan situs atau produk di luar nilai produk yang Anda beli.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Hukum yang Berlaku</h2>
          <p className="mt-2">Syarat ini tunduk pada hukum Republik Indonesia.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Kontak</h2>
          <p className="mt-2">
            Ada pertanyaan? Hubungi kami di{" "}
            <a href="mailto:snapfitindonesia@gmail.com" className="font-medium text-brand hover:underline">snapfitindonesia@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-border pt-6 text-sm">
        <Link href="/privacy" className="font-medium text-brand hover:underline">Lihat Kebijakan Privasi →</Link>
      </div>
    </main>
  );
}
