import Link from "next/link";

export const metadata = {
  title: "Kebijakan Privasi — SNAPFIT",
  description: "Kebijakan privasi SNAPFIT: data apa yang kami kumpulkan dan bagaimana kami menggunakannya.",
};

const UPDATED = "22 September 2026";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Kebijakan Privasi</h1>
      <p className="mt-2 text-sm text-muted-foreground">Terakhir diperbarui: {UPDATED}</p>

      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        <p>
          SNAPFIT (&quot;kami&quot;), dikelola oleh SNAPFIT Indonesia, menghargai privasi Anda. Kebijakan
          ini menjelaskan data apa yang kami kumpulkan saat Anda menggunakan situs
          <Link href="/" className="mx-1 font-medium text-brand hover:underline">snapfit.id</Link>
          dan bagaimana kami menggunakannya.
        </p>

        <section>
          <h2 className="text-base font-semibold text-foreground">1. Data yang Kami Kumpulkan</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Data akun:</b> nama, alamat email, dan foto profil — saat Anda mendaftar dengan email atau login dengan Google.</li>
            <li><b>Data pesanan:</b> nama penerima, nomor telepon, dan alamat pengiriman yang Anda masukkan saat checkout.</li>
            <li><b>Data transaksi:</b> rincian pesanan dan status pembayaran (kami tidak menyimpan nomor kartu Anda).</li>
            <li><b>Data teknis:</b> data dasar peramban/perangkat untuk menjaga sesi login dan keranjang belanja.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">2. Login dengan Google</h2>
          <p className="mt-2">
            Bila Anda memilih masuk dengan Google, kami hanya menerima <b>nama, alamat email, dan foto
            profil</b> dari akun Google Anda untuk membuat dan mengenali akun Anda di SNAPFIT. Kami tidak
            mengakses data Google lainnya, dan tidak memposting apa pun ke akun Google Anda.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">3. Cara Kami Menggunakan Data</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Memproses, mengirim, dan melacak pesanan Anda.</li>
            <li>Mengelola akun dan riwayat pesanan Anda.</li>
            <li>Memberikan layanan pelanggan dan mengirim notifikasi terkait pesanan.</li>
            <li>Meningkatkan produk dan pengalaman berbelanja.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">4. Berbagi Data dengan Pihak Ketiga</h2>
          <p className="mt-2">Kami <b>tidak menjual</b> data pribadi Anda. Kami hanya membagikan data seperlunya kepada penyedia layanan tepercaya untuk menjalankan toko:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><b>Payment gateway</b> (mis. Midtrans) — untuk memproses pembayaran.</li>
            <li><b>Jasa kurir/logistik</b> — untuk mengirim pesanan ke alamat Anda.</li>
            <li><b>Penyedia infrastruktur</b> (mis. Supabase, Vercel, Cloudflare) — untuk menyimpan data dan menjalankan situs secara aman.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">5. Cookie</h2>
          <p className="mt-2">Kami menggunakan cookie/penyimpanan lokal seperlunya untuk menjaga sesi login dan isi keranjang belanja. Anda dapat mengatur cookie melalui peramban Anda.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">6. Keamanan &amp; Penyimpanan</h2>
          <p className="mt-2">Data Anda disimpan pada layanan tepercaya dengan enkripsi in-transit (HTTPS). Kami berupaya wajar melindungi data Anda, meski tidak ada sistem yang 100% bebas risiko.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">7. Hak Anda</h2>
          <p className="mt-2">Anda dapat meminta untuk mengakses, memperbarui, atau menghapus data/akun Anda dengan menghubungi kami di kontak di bawah.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">8. Perubahan Kebijakan</h2>
          <p className="mt-2">Kami dapat memperbarui kebijakan ini sewaktu-waktu. Perubahan akan ditampilkan di halaman ini dengan tanggal pembaruan terbaru.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground">9. Kontak</h2>
          <p className="mt-2">
            Pertanyaan seputar privasi? Hubungi kami di{" "}
            <a href="mailto:snapfitindonesia@gmail.com" className="font-medium text-brand hover:underline">snapfitindonesia@gmail.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 border-t border-border pt-6 text-sm">
        <Link href="/terms" className="font-medium text-brand hover:underline">Lihat Syarat &amp; Ketentuan →</Link>
      </div>
    </main>
  );
}
