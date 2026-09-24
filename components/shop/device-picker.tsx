"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeviceBrand, DeviceLine } from "@/lib/actions/product";

const cardBtn =
  "flex items-center justify-between rounded-lg border border-border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent";

export function DevicePicker({ tree }: { tree: DeviceBrand[] }) {
  const router = useRouter();
  const [brand, setBrand] = useState<DeviceBrand | null>(null);
  const [line, setLine] = useState<DeviceLine | null>(null);

  // Tanpa data (mis. DB kosong saat build) → fallback tautan sederhana.
  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-6 sm:p-8">
        <h2 className="text-lg font-medium">Pilih tipe HP kamu</h2>
        <p className="mt-1 text-sm text-muted-foreground">Kami tampilkan yang pas untuk perangkatmu.</p>
        <Link
          href="/produk"
          className={cn(cardBtn, "mt-5 sm:max-w-xs")}
        >
          Lihat semua produk
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    );
  }

  const step: "brand" | "line" | "model" = line ? "model" : brand ? "line" : "brand";

  return (
    <div className="rounded-2xl border border-border p-6 sm:p-8">
      {/* Header + breadcrumb/back */}
      {step === "brand" ? (
        <>
          <h2 className="text-lg font-medium">Pilih tipe HP kamu</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kami tampilkan yang pas untuk perangkatmu.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={() => (step === "model" ? setLine(null) : setBrand(null))}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {step === "model" ? brand?.name : "Pilih tipe HP kamu"}
        </button>
      )}

      {step !== "brand" && (
        <p className="mt-2 text-lg font-medium">
          {step === "line" ? brand?.name : line?.name}
        </p>
      )}

      {/* Grid pilihan per langkah */}
      <div
        key={step + (brand?.slug ?? "") + (line?.slug ?? "")}
        className="mt-5 grid animate-in fade-in slide-in-from-bottom-1 grid-cols-2 gap-3 duration-200 sm:grid-cols-4"
      >
        {step === "brand" &&
          tree.map((b) => (
            <button
              key={b.slug}
              type="button"
              onClick={() => setBrand(b)}
              className={cardBtn}
            >
              {b.name}
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          ))}

        {step === "line" &&
          brand?.lines.map((l) => (
            <button
              key={l.slug}
              type="button"
              onClick={() => (l.models.length > 0 ? setLine(l) : router.push(`/produk?tipe=${l.slug}`))}
              className={cardBtn}
            >
              <span>
                {l.name}
                <span className="ml-1 text-xs text-muted-foreground">({l.productCount})</span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground" />
            </button>
          ))}

        {step === "model" && line && (
          <>
            <Link href={`/produk?tipe=${line.slug}`} className={cn(cardBtn, "border-dashed")}>
              Semua {line.name}
              <ArrowRight className="size-4 text-muted-foreground" />
            </Link>
            {line.models.map((m) => (
              <Link
                key={m.slug}
                href={`/produk?tipe=${m.slug}`}
                className={cardBtn}
              >
                <span>
                  {m.label}
                  <span className="ml-1 text-xs text-muted-foreground">({m.count})</span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
