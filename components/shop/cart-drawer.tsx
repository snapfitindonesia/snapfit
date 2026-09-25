"use client";

import { useEffect, useState } from "react";
import Image from "@/components/ui/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X, StickyNote, Truck, Ticket, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { useStoreUI } from "@/components/shop/store-ui-provider";
import { applyVoucher } from "@/lib/actions/voucher";

type Panel = "note" | "shipping" | "coupon" | null;

export function CartDrawer({
  flatShipping = true,
  flatCost = 5000,
  freeShippingMin = 0,
}: {
  flatShipping?: boolean;
  flatCost?: number;
  freeShippingMin?: number;
}) {
  const { items, subtotal, count, setQty, removeItem, hydrated, voucher, setVoucher, note, setNote } = useCart();
  const { cartOpen, closeCart } = useStoreUI();

  const [panel, setPanel] = useState<Panel>(null);
  const [code, setCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // Tutup dengan Esc + kunci scroll body saat terbuka.
  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [cartOpen, closeCart]);

  const freeShip = freeShippingMin > 0 && subtotal >= freeShippingMin;
  const baseShipping = flatShipping ? (freeShip ? 0 : flatCost) : 0;
  const discount = voucher?.discount ?? 0;
  const total = Math.max(0, subtotal + baseShipping - discount);
  const remaining = Math.max(0, freeShippingMin - subtotal);
  const progress = freeShippingMin > 0 ? Math.min(100, Math.round((subtotal / freeShippingMin) * 100)) : 0;

  async function onApply() {
    setApplying(true);
    setVoucherError(null);
    const res = await applyVoucher(code, subtotal);
    if (res.ok) {
      setVoucher({ code: res.code, label: res.label, discount: res.discount, freeShipping: res.freeShipping });
      setCode("");
      setPanel(null);
    } else {
      setVoucherError(res.error);
    }
    setApplying(false);
  }

  const togglePanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p));

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!cartOpen}
        onClick={closeCart}
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-300",
          cartOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Keranjang"
        aria-modal={cartOpen}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-3/4 max-w-sm flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
          cartOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingBag className="size-4" />
            Keranjang{count > 0 && <span className="text-muted-foreground">({count})</span>}
          </p>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Tutup keranjang"
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Isi */}
        <div className="flex-1 overflow-y-auto">
          {hydrated && items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Keranjang masih kosong.</p>
              <Button variant="outline" size="sm" asChild onClick={closeCart}>
                <Link href="/produk">Mulai belanja</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.variantId} className="flex gap-3 p-4">
                  <Link
                    href={`/produk/${it.productSlug}`}
                    onClick={closeCart}
                    className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    <Image src={it.image} alt={it.name} fill sizes="64px" className="object-cover" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">{it.name}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{formatRupiah(it.price)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center rounded-md border border-border">
                        <button
                          type="button"
                          aria-label="Kurangi"
                          className="grid size-7 place-items-center disabled:opacity-40"
                          onClick={() => setQty(it.variantId, it.qty - 1)}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm tabular-nums">{it.qty}</span>
                        <button
                          type="button"
                          aria-label="Tambah"
                          className="grid size-7 place-items-center"
                          onClick={() => setQty(it.variantId, it.qty + 1)}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.variantId)}
                        aria-label="Hapus item"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatRupiah(it.price * it.qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border">
            {/* Aksi: Catatan · Pengiriman · Voucher */}
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              <PanelButton icon={StickyNote} label="Catatan" active={panel === "note"} onClick={() => togglePanel("note")} dot={!!note} />
              <PanelButton icon={Truck} label="Ongkir" active={panel === "shipping"} onClick={() => togglePanel("shipping")} />
              <PanelButton icon={Ticket} label="Voucher" active={panel === "coupon"} onClick={() => togglePanel("coupon")} dot={!!voucher} />
            </div>

            {panel && (
              <div className="border-b border-border bg-muted/30 px-4 py-3">
                {panel === "note" && (
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="Catatan untuk penjual (opsional)…"
                    className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                  />
                )}
                {panel === "shipping" && (
                  <p className="text-xs text-muted-foreground">
                    {flatShipping
                      ? freeShip
                        ? "Gratis ongkir untuk pesanan ini 🎉"
                        : `Ongkir flat ${formatRupiah(flatCost)} ke seluruh Indonesia. Alamat & kurir diisi saat checkout.`
                      : "Ongkir dihitung berdasar alamat saat checkout."}
                  </p>
                )}
                {panel === "coupon" && (
                  <div>
                    {voucher ? (
                      <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                        <span className="flex items-center gap-2 text-sm">
                          <Check className="size-4 text-emerald-600" />
                          <span className="font-medium">{voucher.code}</span>
                          <span className="text-xs text-muted-foreground">{voucher.label}</span>
                        </span>
                        <button type="button" onClick={() => setVoucher(null)} className="text-xs text-muted-foreground hover:text-destructive">Hapus</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && onApply()}
                            placeholder="Kode voucher"
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-foreground"
                          />
                          <Button size="sm" onClick={onApply} disabled={applying || !code.trim()}>
                            {applying && <Loader2 className="size-4 animate-spin" />}Pakai
                          </Button>
                        </div>
                        {voucherError && <p className="mt-1.5 text-xs text-destructive">{voucherError}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ringkasan */}
            <div className="space-y-1.5 px-4 pt-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatRupiah(subtotal)}</span>
              </div>
              {flatShipping && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span className="font-medium">{baseShipping === 0 ? "GRATIS" : formatRupiah(baseShipping)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Voucher {voucher?.code}</span>
                  <span className="font-medium">−{formatRupiah(discount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-border pt-2 text-base">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Progress gratis ongkir */}
            {freeShippingMin > 0 && flatShipping && (
              <div className="px-4 pt-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${freeShip ? 100 : progress}%` }} />
                </div>
                <p className="mt-1.5 text-center text-xs text-muted-foreground">
                  {freeShip ? (
                    <span className="font-medium text-brand">Selamat! Kamu dapat GRATIS ONGKIR 🎉</span>
                  ) : (
                    <>Belanja <span className="font-semibold text-brand">{formatRupiah(remaining)}</span> lagi untuk <span className="font-semibold">GRATIS ONGKIR!</span></>
                  )}
                </p>
              </div>
            )}

            {/* Tombol */}
            <div className="grid grid-cols-1 gap-2 p-4">
              <Button asChild onClick={closeCart}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button variant="outline" asChild onClick={closeCart}>
                <Link href="/keranjang">Lihat Keranjang</Link>
              </Button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

function PanelButton({
  icon: Icon, label, active, onClick, dot,
}: {
  icon: typeof StickyNote; label: string; active: boolean; onClick: () => void; dot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
        active ? "bg-muted/50 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
      {dot && <span className="absolute right-3 top-2 size-1.5 rounded-full bg-brand" />}
    </button>
  );
}
