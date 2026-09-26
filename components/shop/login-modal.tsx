"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthForm } from "@/components/auth/auth-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { useStoreUI } from "@/components/shop/store-ui-provider";

export function LoginModal() {
  const { loginOpen, closeLogin, refreshAuth, notify } = useStoreUI();
  const router = useRouter();

  useEffect(() => {
    if (!loginOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLogin();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [loginOpen, closeLogin]);

  return (
    <div
      aria-hidden={!loginOpen}
      inert={!loginOpen} // tertutup: isi modal tak bisa difokus/di-tab (aksesibilitas)
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center p-4 transition-opacity duration-200",
        loginOpen ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div className="absolute inset-0 bg-black/50" onClick={closeLogin} />
      <div
        role="dialog"
        aria-modal={loginOpen}
        aria-label="Masuk"
        className={cn(
          "relative w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl transition-all duration-200",
          loginOpen ? "translate-y-0 scale-100" : "translate-y-2 scale-95",
        )}
      >
        <button
          type="button"
          onClick={closeLogin}
          aria-label="Tutup"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        {/* Logo */}
        <div className="flex justify-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand text-lg font-bold text-brand-foreground">S</span>
        </div>
        <h2 className="mt-3 text-center text-xl font-semibold tracking-tight">Masuk ke SNAPFIT</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Masuk untuk checkout lebih cepat & lacak pesananmu.
        </p>

        <div className="mt-6 space-y-5">
          {loginOpen && (
            <>
              <AuthForm
                mode="login"
                onSuccess={() => {
                  closeLogin();
                  refreshAuth();
                  notify("Berhasil masuk 🎉");
                  router.refresh();
                }}
              />
              <OAuthButtons />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
