import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "@/styles/globals.css";
import { FacebookPixel } from "@/components/tracking/facebook-pixel";
import { GoogleAnalytics } from "@/components/tracking/google-analytics";
import { Suspense } from "react";
import { preconnect } from "react-dom";
import { getThemeColors } from "@/lib/theme-settings";
import { themeCss } from "@/lib/theme-colors";

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
    "Toko resmi SNAPFIT: case HP, pelindung layar & aksesori untuk iPhone, Samsung Galaxy, dan AirPods. Bergaransi, gratis ongkir s/d Rp20rb min. Rp150rb.",
  applicationName: "SNAPFIT Indonesia",
  keywords: [
    "case hp", "casing hp premium", "aksesoris gadget", "case iphone", "case samsung",
    "SNAPFIT", "SNAPFIT Indonesia", "tempered glass", "case airpods",
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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Koneksi awal ke CDN foto (banner/kartu = elemen LCP, beda domain dari halaman).
  // Pixel & GA4 SENGAJA tidak di-preconnect — skripnya baru dimuat saat interaksi
  // (useDeferredLoad), preconnect di awal hanya berebut jaringan dengan LCP.
  preconnect("https://cdn.snapfit.id");
  // Warna situs dari Admin → Warna Situs (kosong = bawaan di styles/globals.css).
  const colors = await getThemeColors();
  const css = themeCss(colors);
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {css && (
        <head>
          <style id="theme-colors" dangerouslySetInnerHTML={{ __html: css }} />
        </head>
      )}
      <body className="min-h-full flex flex-col">
        {/* Progress bar navigasi — feedback instan tiap klik pindah halaman */}
        <NextTopLoader color={colors.primary} height={3} showSpinner={false} shadow={`0 0 8px ${colors.primary}`} />
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
