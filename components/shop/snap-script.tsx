import Script from "next/script";

// Snap.js Midtrans (komponen SERVER → key dibaca saat render, tak perlu awalan NEXT_PUBLIC_).
// MIDTRANS_CLIENT_KEY = nama di Vercel; NEXT_PUBLIC_MIDTRANS_CLIENT_KEY = nama lama (tetap didukung).
// Client key memang publik (ikut tampil di halaman checkout) — yang rahasia hanya server key.
// URL sandbox vs production dideteksi dari awalan client key (sandbox = "SB-Mid-client-...").
// Tanpa client key → tidak dimuat.
export function SnapScript() {
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
  if (!clientKey) return null;
  const src = clientKey.startsWith("SB-")
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";
  return <Script src={src} data-client-key={clientKey} strategy="afterInteractive" />;
}
