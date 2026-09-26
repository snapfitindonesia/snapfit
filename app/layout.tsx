import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "@/styles/globals.css";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/tracking/gtm";
import { FacebookPixel } from "@/components/tracking/facebook-pixel";
import { GoogleAnalytics } from "@/components/tracking/google-analytics";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.snapfit.id"),
  title: {
    default: "SNAPFIT Indonesia - Aksesoris Gadget Premium",
    template: "%s | SNAPFIT Indonesia",
  },
  description:
    "Toko resmi aksesoris gadget premium: case HP, tablet & AirPods original Ringke, VRS Design, Araree, Supcase & SNAPFIT. Garansi resmi, gratis ongkir min. Rp150rb.",
  applicationName: "SNAPFIT Indonesia",
  keywords: [
    "case hp", "casing hp premium", "aksesoris gadget", "case iphone", "case samsung",
    "Ringke Indonesia", "VRS Design", "Araree", "Supcase", "SNAPFIT",
  ],
  openGraph: {
    type: "website",
    siteName: "SNAPFIT Indonesia",
    locale: "id_ID",
  },
  twitter: { card: "summary_large_image" },
  // Verifikasi domain Facebook/Meta (Business Manager → Brand Safety → Domains).
  other: {
    "facebook-domain-verification": "si7g62hg0l0tbbdq6gz6u6wdxfmai2",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Progress bar navigasi — feedback instan tiap klik pindah halaman */}
        <NextTopLoader color="#171717" height={3} showSpinner={false} shadow="0 0 8px #171717" />
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        <Suspense>
          <FacebookPixel />
        </Suspense>
        <Suspense>
          <GoogleAnalytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
