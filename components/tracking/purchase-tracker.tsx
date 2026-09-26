"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/tracking";

type Item = { item_id: string; item_name: string; price: number; quantity: number };

// Fire `purchase` sekali (setelah PAID). Guard localStorage cegah double-count
// saat halaman sukses di-refresh / dibuka ulang dari email (docs/08). Lintas
// perangkat: GA4 dedup via transaction_id, Meta via event_id tetap.
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
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // storage tak tersedia — tetap lanjut fire
    }
    fired.current = true;
    trackPurchase(transactionId, value, items, { email, phone });
  }, [transactionId, value, items, email, phone]);

  return null;
}
