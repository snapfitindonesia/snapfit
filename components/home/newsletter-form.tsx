"use client";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { subscribeNewsletter } from "@/lib/actions/newsletter";
import { cn } from "@/lib/utils";

/** Form email bagian "Langganan" (beranda). Berhasil → pesan + kode voucher (bila diatur admin). */
export function NewsletterForm({
  sectionId,
  placeholder,
  buttonLabel,
  successText,
  light = false,
}: {
  sectionId: string;
  placeholder: string;
  buttonLabel: string;
  successText: string;
  light?: boolean; // latar terang → teks & kotak gelap
}) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("loading");
    setError(null);
    const res = await subscribeNewsletter({
      email: String(fd.get("email") ?? ""),
      website: String(fd.get("website") ?? ""),
      sectionId,
    }).catch(() => ({ ok: false, error: "Gagal terhubung. Coba lagi.", voucherCode: undefined }));
    if (res.ok) {
      setCode(res.voucherCode);
      setState("done");
    } else {
      setError(res.error ?? "Gagal. Coba lagi.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className={cn("mx-auto max-w-[520px] rounded-[5px] border px-5 py-5 backdrop-blur-[10px]", light ? "border-foreground/15 bg-white" : "border-white/14 bg-white/[0.08]")} role="status">
        <p className={cn("text-[15px] font-medium", light ? "text-foreground" : "text-white")}>{successText || "Terima kasih sudah berlangganan!"}</p>
        {code && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className={cn("rounded-[5px] border border-dashed px-4 py-2 font-mono text-lg font-bold tracking-[0.12em]", light ? "border-foreground/40 text-foreground" : "border-white/40 text-white")}>{code}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(code).then(() => setCopied(true));
              }}
              className={cn("inline-flex h-[42px] items-center gap-1.5 rounded-[5px] px-4 text-sm font-semibold transition-colors", light ? "bg-foreground text-background hover:bg-foreground/85" : "bg-white text-neutral-950 hover:bg-white/85")}
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Tersalin" : "Salin"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={submit}
        noValidate={false}
        aria-label="Langganan email"
        className={cn("mx-auto flex max-w-[520px] flex-col gap-1.5 rounded-[5px] border p-1.5 backdrop-blur-[10px] sm:flex-row sm:items-center sm:gap-2 sm:pl-[22px]", light ? "border-foreground/15 bg-white" : "border-white/14 bg-white/[0.08]")}
      >
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          aria-label="Alamat email"
          placeholder={placeholder || "email@kamu.com"}
          className={cn("min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[15px] outline-none sm:px-0 sm:py-3", light ? "text-foreground placeholder:text-foreground/50" : "text-white placeholder:text-white/50")}
        />
        {/* Honeypot anti-bot (tak terlihat manusia) */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <button
          type="submit"
          disabled={state === "loading"}
          className="inline-flex h-[42px] w-full shrink-0 items-center justify-center gap-2 rounded-[5px] bg-brand-ink px-7 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_18px_rgba(242,101,34,0.25)] transition-all duration-200 hover:-translate-y-px hover:bg-[#a3360b] hover:shadow-[0_14px_32px_rgba(242,101,34,0.35)] disabled:opacity-70 sm:w-auto"
        >
          {state === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {buttonLabel || "Langganan"}
        </button>
      </form>
      {error && (
        <p className={cn("mt-3 text-sm", light ? "text-destructive" : "text-[#fca5a5]")} role="alert">
          {error}
        </p>
      )}
    </>
  );
}
