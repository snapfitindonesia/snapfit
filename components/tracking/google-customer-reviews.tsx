"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// Merchant Center ID toko (Google Customer Reviews). Override via env.
const MERCHANT_ID = Number(process.env.NEXT_PUBLIC_GCR_MERCHANT_ID || "5859428306");
const DELIVERY_DAYS = 5; // perkiraan tiba (survei dikirim Google setelah tanggal ini)

declare global {
  interface Window {
    renderOptIn?: () => void;
    gapi?: { load: (m: string, cb: () => void) => void; surveyoptin?: { render: (o: unknown) => void } };
  }
}

/**
 * Modul opt-in survei Google Customer Reviews di halaman konfirmasi pesanan.
 * Tampil SEKALI per pesanan (localStorage) dan hanya untuk pesanan yang sudah
 * dibayar. Pembeli yang setuju dikirimi survei oleh Google setelah paket tiba →
 * rating toko (bintang) di Google Shopping.
 */
export function GoogleCustomerReviews({ orderId, email }: { orderId: string; email?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!MERCHANT_ID || !email) return;
    const key = `snapfit.gcr.${orderId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // storage tak tersedia — tetap tampilkan
    }
    const eta = new Date(Date.now() + DELIVERY_DAYS * 86_400_000).toISOString().slice(0, 10);
    window.renderOptIn = () => {
      window.gapi?.load("surveyoptin", () => {
        window.gapi?.surveyoptin?.render({
          merchant_id: MERCHANT_ID,
          order_id: orderId,
          email,
          delivery_country: "ID",
          estimated_delivery_date: eta,
          opt_in_style: "BOTTOM_TRAY", // nyaman di HP
        });
      });
    };
    setShow(true);
  }, [orderId, email]);

  if (!show) return null;
  return <Script src="https://apis.google.com/js/platform.js?onload=renderOptIn" strategy="afterInteractive" />;
}
