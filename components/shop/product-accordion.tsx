import { ChevronDown } from "lucide-react";

type Variant = { name: string };

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="pb-4 text-sm text-muted-foreground">{children}</div>
    </details>
  );
}

export function ProductAccordion({
  description,
  variants,
}: {
  description: string | null;
  variants: Variant[];
}) {
  return (
    <div className="mt-12 rounded-2xl border border-border p-4 sm:p-6">
      <Item title="Informasi produk">
        <p>{description || "Aksesori premium dari SnapFit, dikurasi untuk pas dan tahan lama."}</p>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Garansi resmi & 100% original</li>
          <li>Material berkualitas, tahan pakai</li>
          <li>7 hari pengembalian bila tidak sesuai</li>
        </ul>
      </Item>

      <Item title="Kompatibilitas / pilihan tipe">
        <p>Tersedia untuk tipe berikut — pilih yang sesuai perangkatmu:</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {variants.map((v) => (
            <li
              key={v.name}
              className="rounded-full border border-border px-3 py-1 text-xs"
            >
              {v.name}
            </li>
          ))}
        </ul>
      </Item>

      <Item title="Pengiriman & pengembalian">
        <p>
          Dikirim dari gudang kami via kurir pilihanmu (cek ongkir di checkout).
          Estimasi 1–3 hari untuk area umum. Tidak sesuai? Ajukan pengembalian dalam
          7 hari.
        </p>
      </Item>

      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-medium">
          FAQ
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 pb-2 text-sm text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Apa produknya original?</p>
            <p>Ya, semua produk 100% original dengan garansi resmi.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Bagaimana kalau ukuran/tipe salah?</p>
            <p>Bisa ditukar/dikembalikan dalam 7 hari selama kondisi masih baru.</p>
          </div>
        </div>
      </details>
    </div>
  );
}
