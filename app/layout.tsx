import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "@/styles/globals.css";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/tracking/gtm";
import { FacebookPixel } from "@/components/tracking/facebook-pixel";
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
  title: "SNAPFIT",
  description: "SNAPFIT — toko online",
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
        {children}
      </body>
    </html>
  );
}
