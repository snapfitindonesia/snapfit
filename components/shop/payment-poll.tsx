"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Midtrans: webhook lunas bisa tiba beberapa detik setelah pembeli diarahkan ke sini → muat ulang status berkala (maks. ±2 menit). */
export function PaymentPoll() {
  const router = useRouter();
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (++n > 24) return clearInterval(t);
      router.refresh();
    }, 5000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
