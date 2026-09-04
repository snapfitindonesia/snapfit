import Image from "next/image";
import { cn } from "@/lib/utils";

// Feature story sections ala Nomad — blok gambar + teks berselang.
// Copy generik (relevan aksesori HP) — bisa diedit; gambar pakai foto produk/varian.

type Section = { title: string; body: string; image: string };

export function PdpStory({
  productName,
  images,
}: {
  productName: string;
  images: string[];
}) {
  const img = (i: number) => images[i % images.length] ?? images[0];

  const sections: Section[] = [
    {
      title: "Pas presisi",
      body: `${productName} dibuat mengikuti bentuk perangkat — potongan akurat untuk tombol, kamera, dan port. Tak ada bagian yang mengganjal, semua terasa menyatu.`,
      image: img(0),
    },
    {
      title: "Proteksi menyeluruh",
      body: "Sudut yang diperkuat meredam benturan saat terjatuh, permukaan melindungi dari goresan sehari-hari. Perangkatmu tetap mulus, lebih lama.",
      image: img(1),
    },
    {
      title: "Material premium",
      body: "Dibuat dari bahan berkualitas yang tahan pakai — tidak menguning, tidak gampang longgar, dan nyaman digenggam setiap hari.",
      image: img(2),
    },
  ];

  return (
    <div className="mt-16 space-y-4">
      {sections.map((s, i) => {
        const imageLeft = i % 2 === 0;
        return (
          <section
            key={s.title}
            className="overflow-hidden rounded-2xl border border-border bg-muted/30"
          >
            <div
              className={cn(
                "grid items-center gap-0 md:grid-cols-2",
                !imageLeft && "md:[&>*:first-child]:order-2",
              )}
            >
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Image
                  src={s.image}
                  alt={s.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="p-8 sm:p-10 lg:p-12">
                <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-md text-muted-foreground text-pretty">
                  {s.body}
                </p>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
