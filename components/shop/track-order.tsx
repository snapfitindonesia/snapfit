"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { trackOrder, type TrackedOrder } from "@/lib/actions/track";
import { waChatUrl } from "@/lib/contact";
import { WhatsAppIcon } from "@/components/shop/whatsapp-float";

const input =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground";

const STEPS = [
  { key: "PENDING", label: "Pesanan dibuat" },
  { key: "PAID", label: "Pembayaran diterima" },
  { key: "PROCESSING", label: "Dikemas" },
  { key: "SHIPPED", label: "Dikirim" },
  { key: "DONE", label: "Selesai" },
];
const ORDER = STEPS.map((s) => s.key);

const HEADLINE: Record<string, string> = {
  PENDING: "Menunggu pembayaran",
  PAID: "Pembayaran diterima — segera kami kemas",
  PROCESSING: "Pesanan sedang dikemas",
  SHIPPED: "Pesanan dalam perjalanan",
  DONE: "Pesanan selesai",
  CANCELLED: "Pesanan dibatalkan",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
}

export function TrackOrder({ initialOrder = "" }: { initialOrder?: string }) {
  const [orderNo, setOrderNo] = useState(initialOrder);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [copied, setCopied] = useState(false);

  // Isian terakhir diingat di perangkat ini (tanpa kirim ke mana pun).
  useEffect(() => {
    try {
      const c = localStorage.getItem("snapfit.track.contact");
      if (c) setContact(c);
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    const res = await trackOrder({ orderNo, contact });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setOrder(res.order);
    try {
      localStorage.setItem("snapfit.track.contact", contact.trim());
    } catch {}
  }

  const stepIdx = order ? ORDER.indexOf(order.status) : -1;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border p-5 sm:p-6">
        <label className="block text-sm font-medium">
          Nomor pesanan
          <input
            className={`mt-1 ${input} font-mono uppercase`}
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            placeholder="mis. SNAP-1790330456133-0M8IWU"
            required
          />
        </label>
        <label className="block text-sm font-medium">
          Email atau nomor HP
          <input
            className={`mt-1 ${input}`}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="yang dipakai saat checkout"
            autoComplete="email"
            required
          />
        </label>
        <p className="text-xs text-muted-foreground">Nomor pesanan ada di email konfirmasi dari SNAPFIT Indonesia.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Lacak pesanan
        </Button>
      </form>

      {order && (
        <div className="space-y-5 rounded-2xl border border-border p-5 sm:p-6">
          <div>
            <p className="text-xs text-muted-foreground">
              {order.orderNo} · {fmtDate(order.createdAt)}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{HEADLINE[order.status] ?? order.status}</h2>
            {order.firstName && (
              <p className="text-sm text-muted-foreground">
                Untuk {order.firstName}
                {order.city ? ` · ${order.city}` : ""}
              </p>
            )}
          </div>

          {/* Timeline */}
          {order.status !== "CANCELLED" && (
            <ol className="grid grid-cols-5 gap-1">
              {STEPS.map((s, i) => {
                const done = i <= stepIdx;
                return (
                  <li key={s.key} className="flex flex-col items-center text-center">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full border text-xs",
                        done ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className={cn("mt-1.5 text-[11px] leading-tight", done ? "font-medium" : "text-muted-foreground")}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {/* Instruksi bayar (transfer manual) */}
          {order.bank && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
              <p className="font-semibold text-amber-900">Selesaikan pembayaran</p>
              <p className="mt-1 text-amber-800">
                Transfer <b>{formatRupiah(order.total)}</b> ke {order.bank.bank} <b className="font-mono">{order.bank.accountNumber}</b> a/n{" "}
                {order.bank.accountName}.
              </p>
            </div>
          )}

          {/* Resi */}
          {order.trackingNo && (
            <div className="rounded-xl bg-muted/60 p-4">
              <p className="text-xs text-muted-foreground">Nomor resi{order.courier ? ` ${order.courier}` : ""}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-semibold tracking-wide">{order.trackingNo}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(order.trackingNo!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Tersalin" : "Salin"}
                </button>
                <a
                  href={`https://cekresi.com/?noresi=${encodeURIComponent(order.trackingNo)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <ExternalLink className="size-3.5" /> Cek posisi paket
                </a>
              </div>
              {order.shippedAt && <p className="mt-1 text-xs text-muted-foreground">Dikirim {fmtDate(order.shippedAt)}</p>}
            </div>
          )}

          {/* Rincian */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Package className="size-4" /> Rincian pesanan
            </p>
            <ul className="divide-y divide-border text-sm">
              {order.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span>
                    {it.name} <span className="text-muted-foreground">× {it.qty}</span>
                  </span>
                  <span className="shrink-0">{formatRupiah(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Ongkir</dt><dd>{order.shippingCost > 0 ? formatRupiah(order.shippingCost) : "Gratis"}</dd></div>
              {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">Diskon</dt><dd>− {formatRupiah(order.discount)}</dd></div>}
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatRupiah(order.total)}</dd></div>
            </dl>
          </div>

          <a
            href={waChatUrl(`Halo SNAPFIT, saya mau tanya pesanan ${order.orderNo}.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium hover:border-[#25D366]"
          >
            <WhatsAppIcon className="size-4 text-[#25D366]" /> Tanya soal pesanan ini via WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
