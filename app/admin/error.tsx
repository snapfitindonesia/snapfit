"use client";

import { ErrorContent } from "@/components/shop/error-content";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorContent error={error} reset={reset} homeHref="/admin" />;
}
