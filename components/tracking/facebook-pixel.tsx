"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const PIXEL_ID = process.env.NEXT_PUBLIC_FB_PIXEL_ID ?? "";

/**
 * Facebook (Meta) Pixel. Aktif hanya bila NEXT_PUBLIC_FB_PIXEL_ID diisi.
 * Base code memuat fbevents.js + PageView awal; PageView berikutnya dikirim
 * saat pindah halaman (SPA). Event e-commerce dikirim dari lib/tracking.ts.
 */
export function FacebookPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  // PageView saat navigasi klien (base code sudah kirim PageView pertama).
  useEffect(() => {
    if (!PIXEL_ID) return;
    if (first.current) { first.current = false; return; }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!PIXEL_ID) return null;

  return (
    <>
      {/* Stub antrean fbq (ringan) segera; fbevents.js (±110KB + config) dimuat
          SETELAH halaman tampil (lazyOnload) lalu memproses antrean — tak ada event hilang. */}
      <Script id="fb-pixel" strategy="afterInteractive">
        {`!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window);fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
      </Script>
      <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="lazyOnload" />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img height="1" width="1" style={{ display: "none" }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} />
      </noscript>
    </>
  );
}
