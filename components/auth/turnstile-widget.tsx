"use client";

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
        },
      ) => string;
    };
  }
}

/** Widget CAPTCHA. Tanpa site key → tidak dirender (server verify dilewati di dev). */
export function TurnstileWidget({ onToken }: { onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);

  useEffect(() => {
    if (!SITE_KEY || rendered.current) return;

    function render() {
      if (!ref.current || !window.turnstile || rendered.current) return;
      rendered.current = true;
      window.turnstile.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
      });
    }

    if (window.turnstile) {
      render();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", render);
    return () => script.removeEventListener("load", render);
  }, [onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}
