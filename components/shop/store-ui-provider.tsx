"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StoreUI = {
  authed: boolean;
  refreshAuth: () => void;
  notify: (msg: string) => void;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  loginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
};

const Ctx = createContext<StoreUI | null>(null);

export function StoreUIProvider({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // Cek ulang sesi dari cookie (tanpa network) — dipanggil setelah login modal
  // dan saat tab kembali fokus, karena login via server-action tak memicu
  // onAuthStateChange di browser client.
  const refreshAuth = useCallback(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
  }, []);

  // Deteksi sesi di client, ikuti perubahan login/logout, dan re-cek saat fokus.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setAuthed(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(Boolean(session));
    });
    const onFocus = () => refreshAuth();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshAuth]);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const value = useMemo<StoreUI>(
    () => ({ authed, refreshAuth, notify, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin }),
    [authed, refreshAuth, notify, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Toast global (mis. "Berhasil masuk") */}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 transition-all duration-300 ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        {toast && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background shadow-lg">
            <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            {toast}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useStoreUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStoreUI harus dipakai di dalam <StoreUIProvider>");
  return ctx;
}
