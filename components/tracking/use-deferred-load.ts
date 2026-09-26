"use client";

import { useEffect, useState } from "react";

// Script pihak ketiga (gtag ±170KB, fbevents ±190KB) dimuat saat interaksi
// pertama (sentuh/scroll/klik/ketik) atau setelah FALLBACK_MS — mana yang lebih
// dulu. Tampilan pertama tak berebut jaringan & CPU dengan analitik; event tak
// hilang karena stub antrean (fbq/gtag) sudah aktif sejak awal. Status global:
// setelah terpicu sekali, navigasi berikutnya langsung memuat.
const FALLBACK_MS = 5000;
const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

let triggered = false;
const listeners = new Set<() => void>();

function trigger() {
  if (triggered) return;
  triggered = true;
  for (const e of EVENTS) window.removeEventListener(e, trigger);
  listeners.forEach((fn) => fn());
  listeners.clear();
}

export function useDeferredLoad(): boolean {
  const [ready, setReady] = useState(triggered);
  useEffect(() => {
    if (triggered) {
      setReady(true);
      return;
    }
    const done = () => setReady(true);
    listeners.add(done);
    for (const e of EVENTS) window.addEventListener(e, trigger, { once: true, passive: true });
    const t = setTimeout(trigger, FALLBACK_MS);
    return () => {
      listeners.delete(done);
      clearTimeout(t);
    };
  }, []);
  return ready;
}
