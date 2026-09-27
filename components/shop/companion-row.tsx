"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import Image from "@/components/ui/image";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { trackAddToCart } from "@/lib/tracking";
import type { Companion, CompanionOption } from "@/lib/cross-sell";

const KIND_LABEL = { glass: "Pelindung layar", lens: "Pelindung kamera", case: "Case", other: "" } as const;
const MAX_SHOWN = 3;

/**
 * "Lengkapi dengan" — pelengkap untuk TIPE HP varian terpilih. Tak tampil bila
 * tak ada yang cocok persis (lebih baik kosong daripada salah tipe).
 * 1 varian cocok → tambah langsung ke keranjang; lebih → buka produknya dengan
 * varian tipe itu terpilih.
 */
export function CompanionRow({
  companions,
  typeKey,
  typeName,
}: {
  companions: Companion[];
  typeKey: string | null;
  typeName: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState<Set<string>>(new Set());
  if (!typeKey) return null;

  const rows = companions
    .map((c) => ({ ...c, opt: c.options.find((o) => o.key === typeKey) }))
    .filter((c): c is Companion & { opt: CompanionOption } => !!c.opt)
    .slice(0, MAX_SHOWN);
  if (!rows.length) return null;

  function add(c: (typeof rows)[number]) {
    const v = c.opt;
    const name = `${c.name} — ${v.name}`;
    addItem({ variantId: v.id, productSlug: c.slug, name, price: v.price, image: v.image }, 1);
    trackAddToCart({ item_id: v.id, item_name: name, price: v.price, quantity: 1 });
    setAdded((s) => new Set(s).add(v.id));
  }

  return (
    <section className="mt-6 rounded-xl border border-border p-4" aria-label="Produk pelengkap">
      <h2 className="text-sm font-semibold">
        Lengkapi dengan <span className="font-normal text-muted-foreground">· untuk {typeName}</span>
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map((c) => {
          const v = c.opt;
          const single = v.count === 1;
          const isAdded = added.has(v.id);
          return (
            <li key={c.productId} className="flex items-center gap-3">
              {/* Foto = duplikat tautan nama → disembunyikan dari pembaca layar & Tab */}
              <Link href={`/produk/${c.slug}?varian=${v.id}`} aria-hidden tabIndex={-1} className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={v.image} alt="" fill sizes="56px" className="object-contain p-1" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND_LABEL[c.kind]}</p>
                <Link href={`/produk/${c.slug}?varian=${v.id}`} className="line-clamp-2 text-[13px] leading-snug hover:underline">
                  {c.name}
                </Link>
                <p className="mt-0.5 text-sm font-semibold">
                  {single ? "" : "mulai "}
                  {formatRupiah(v.price)}
                </p>
              </div>
              {single ? (
                <button
                  type="button"
                  onClick={() => add(c)}
                  disabled={isAdded}
                  aria-label={isAdded ? `${c.name} sudah di keranjang` : `Tambah ${c.name} ke keranjang`}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-foreground px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-foreground hover:text-background disabled:border-border disabled:text-muted-foreground disabled:hover:bg-transparent"
                >
                  {isAdded ? <><Check className="size-3.5" /> Masuk</> : <><Plus className="size-3.5" /> Tambah</>}
                </button>
              ) : (
                <Link
                  href={`/produk/${c.slug}?varian=${v.id}`}
                  className="inline-flex shrink-0 items-center rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:border-foreground"
                >
                  Pilih
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
