"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { useCart } from "@/components/shop/cart-provider";
import { restoreCheckoutDraft } from "@/lib/actions/cart-draft";

/**
 * `/keranjang?pulih=<token>` (dari email/WA pengingat) → masukkan kembali produk
 * yang masih tersedia ke keranjang, lalu bersihkan URL. Item yang sudah ada
 * di keranjang tidak digandakan.
 */
export function CartRestore() {
  const token = useSearchParams().get("pulih");
  const router = useRouter();
  const { items, hydrated, addItem } = useCart();
  const done = useRef(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !hydrated || done.current) return;
    done.current = true;
    restoreCheckoutDraft(token)
      .then((res) => {
        const have = new Set(items.map((i) => i.variantId));
        const fresh = res.items.filter((i) => !have.has(i.variantId));
        for (const { qty, ...item } of fresh) addItem(item, qty);
        setMsg(
          !res.ok
            ? "Tautan pemulihan tidak valid atau sudah kedaluwarsa."
            : res.items.length === 0
              ? "Maaf, produk di keranjangmu sebelumnya sedang habis."
              : "Keranjangmu sudah dipulihkan. Tinggal checkout!",
        );
      })
      .catch(() => setMsg("Gagal memulihkan keranjang. Coba lagi."))
      .finally(() => router.replace("/keranjang", { scroll: false }));
  }, [token, hydrated, items, addItem, router]);

  if (!msg) return null;
  return (
    <p role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
      <Check className="size-4 shrink-0 text-emerald-600" /> {msg}
    </p>
  );
}
