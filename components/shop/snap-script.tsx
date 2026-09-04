import Script from "next/script";

const CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

// Snap.js Midtrans. URL sandbox vs production dideteksi dari prefix client key
// (sandbox = "SB-Mid-client-..."). Tanpa client key → tidak dimuat (mode mock).
export function SnapScript() {
  if (!CLIENT_KEY) return null;
  const src = CLIENT_KEY.startsWith("SB-")
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";
  return <Script src={src} data-client-key={CLIENT_KEY} strategy="afterInteractive" />;
}
