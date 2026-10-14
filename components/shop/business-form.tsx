"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { waChatUrl } from "@/lib/contact";
import { sendBusinessInquiry } from "@/lib/actions/business";
import {
  BUSINESS_TYPES,
  BUSINESS_VOLUMES,
  businessInquirySchema,
  type BusinessInquiryInput,
} from "@/lib/validations/business";

type Form = Required<Omit<BusinessInquiryInput, "website">> & { website: string };
const EMPTY: Form = { name: "", company: "", email: "", phone: "", city: "", type: "" as Form["type"], volume: "" as Form["volume"], message: "", website: "" };

const base =
  "mt-1.5 w-full rounded-md border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-foreground";

/** Formulir Kerja Sama Bisnis (/bisnis) → email ke admin lewat sendBusinessInquiry. */
export function BusinessForm() {
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = businessInquirySchema.safeParse(f);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) if (v?.[0]) fe[k] = v[0];
      setErrors(fe);
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-business-form] [aria-invalid='true']")?.focus());
      return;
    }
    setBusy(true);
    const res = await sendBusinessInquiry(f).catch(() => ({ ok: false as const, error: "Gagal mengirim. Coba lagi." }));
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  const waText = `Halo SNAPFIT, saya ${f.name || "…"}${f.company ? ` dari ${f.company}` : ""}, tertarik kerja sama${f.type ? ` (${f.type})` : ""}.`;

  if (sent) {
    return (
      <div role="status" className="rounded-2xl border border-border bg-card p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h3 className="mt-3 text-xl font-semibold">Terima kasih, {f.name.split(" ")[0]}!</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Permintaanmu sudah kami terima. Tim kami akan menghubungimu lewat email atau WhatsApp. Ingin lebih cepat?
          Lanjutkan obrolan di WhatsApp.
        </p>
        <Button asChild size="lg" className="mt-5">
          <a href={waChatUrl(waText)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> Chat WhatsApp
          </a>
        </Button>
      </div>
    );
  }

  const field = (k: keyof Form) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `bisnis-${k}-err` : undefined,
    className: cn(base, errors[k] ? "border-destructive" : "border-border"),
  });
  const err = (k: keyof Form) =>
    errors[k] ? (
      <span id={`bisnis-${k}-err`} className="mt-1 block text-xs text-destructive">
        {errors[k]}
      </span>
    ) : null;

  return (
    <form data-business-form onSubmit={submit} noValidate className="rounded-2xl border border-border bg-card p-5 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Nama</span>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" {...field("name")} />
          {err("name")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Perusahaan / toko <span className="font-normal text-muted-foreground">(opsional)</span></span>
          <input value={f.company} onChange={(e) => set("company", e.target.value)} autoComplete="organization" {...field("company")} />
          {err("company")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input type="email" inputMode="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" {...field("email")} />
          {err("email")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">No. WhatsApp</span>
          <input type="tel" inputMode="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" placeholder="08…" {...field("phone")} />
          {err("phone")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Jenis kerja sama</span>
          <select value={f.type} onChange={(e) => set("type", e.target.value as Form["type"])} {...field("type")}>
            <option value="" disabled>
              Pilih…
            </option>
            {BUSINESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {err("type")}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Perkiraan jumlah</span>
          <select value={f.volume} onChange={(e) => set("volume", e.target.value as Form["volume"])} {...field("volume")}>
            <option value="" disabled>
              Pilih…
            </option>
            {BUSINESS_VOLUMES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {err("volume")}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Kota <span className="font-normal text-muted-foreground">(opsional)</span></span>
          <input value={f.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" {...field("city")} />
          {err("city")}
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium">Ceritakan kebutuhanmu <span className="font-normal text-muted-foreground">(opsional)</span></span>
          <textarea
            value={f.message}
            onChange={(e) => set("message", e.target.value)}
            rows={4}
            placeholder="Mis. tipe HP yang dibutuhkan, desain/logo, target waktu, atau pertanyaan lain."
            {...field("message")}
          />
          {err("message")}
        </label>
        {/* Jebakan bot — tersembunyi dari manusia & pembaca layar */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={f.website}
          onChange={(e) => set("website", e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" size="lg" disabled={busy} className="sm:min-w-48">
          {busy && <Loader2 className="size-4 animate-spin" />}
          Kirim permintaan
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href={waChatUrl(waText)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="size-4" /> Atau chat WhatsApp
          </a>
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Data hanya dipakai untuk menghubungimu soal kerja sama ini. Lihat{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Kebijakan Privasi
        </Link>
        .
      </p>
    </form>
  );
}
