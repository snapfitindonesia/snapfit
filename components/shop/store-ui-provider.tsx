"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type StoreUI = {
  authed: boolean;
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

  // Deteksi sesi di client (baca dari storage, tanpa network yang memblokir),
  // lalu ikuti perubahan login/logout secara real-time.
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
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openLogin = useCallback(() => setLoginOpen(true), []);
  const closeLogin = useCallback(() => setLoginOpen(false), []);

  const value = useMemo<StoreUI>(
    () => ({ authed, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin }),
    [authed, cartOpen, openCart, closeCart, loginOpen, openLogin, closeLogin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStoreUI() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStoreUI harus dipakai di dalam <StoreUIProvider>");
  return ctx;
}
