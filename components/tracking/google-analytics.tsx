"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

// GA4 measurement ID. Override via NEXT_PUBLIC_GA_ID; default = ID toko.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-H34K2TJPJP";

/**
 * Google Analytics 4 (gtag.js). Base code kirim page_view awal; navigasi
 * klien (SPA) kirim page_view berikutnya via usePathname.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!GA_ID) return;
    if (first.current) { first.current = false; return; } // page_view pertama sudah dari config
    window.gtag?.("event", "page_view", { page_path: pathname });
  }, [pathname]);

  if (!GA_ID) return null;

  return (
    <>
      {/* gtag.js (±170KB) dimuat setelah halaman tampil; perintah di dataLayer
          (config + event) sudah diantrekan lebih dulu oleh ga-init → tak hilang. */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
