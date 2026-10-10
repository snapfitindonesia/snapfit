"use client";

import { ErrorContent } from "@/components/shop/error-content";

// Error saat render halaman toko (mis. database sesaat tak terjangkau) → tetap dengan header & footer toko.
export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} />;
}
