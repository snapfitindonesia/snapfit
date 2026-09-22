"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useStoreUI } from "@/components/shop/store-ui-provider";

// Menampilkan toast "Berhasil masuk" saat mendarat dgn ?login=success
// (dipakai setelah login email di /masuk & setelah OAuth Google), lalu
// membersihkan param dari URL.
export function AuthToast() {
  const { notify } = useStoreUI();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (params.get("login") !== "success") return;
    notify("Berhasil masuk 🎉");
    const next = new URLSearchParams(params.toString());
    next.delete("login");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [params, pathname, router, notify]);

  return null;
}
