"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StoreUI = {
  authed: boolean;
  refreshAuth: () => void;
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
    () => ({ authed, refreshAuth, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin }),
    [authed, refreshAuth, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStoreUI harus dipakai di dalam <StoreUIProvider>");
  return ctx;
}
