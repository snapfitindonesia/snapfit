"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/tracking";

type Item = { item_id: string; item_name: string; price: number; quantity: number };

// Fire `purchase` sekali (setelah PAID). Guard sessionStorage cegah double-count
// saat halaman sukses di-refresh (docs/08).
export function PurchaseTracker({
  transactionId,
  value,
  items,
  email,
  phone,
}: {
  transactionId: string;
  value: number;
  items: Item[];
  email?: string;
  phone?: string;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    const key = `snapfit.purchase.${transactionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // storage tak tersedia — tetap lanjut fire
    }
    fired.current = true;
    trackPurchase(transactionId, value, items, { email, phone });
  }, [transactionId, value, items, email, phone]);

  return null;
}
