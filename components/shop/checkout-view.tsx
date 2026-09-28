"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trackBeginCheckout } from "@/lib/tracking";
import { Loader2, ShoppingBag, Truck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/components/shop/cart-provider";
import { addressSchema } from "@/lib/validations/checkout";
import { createOrder } from "@/lib/actions/order";
import { applyVoucher } from "@/lib/actions/voucher";
import { saveCheckoutDraft } from "@/lib/actions/cart-draft";
import { VoucherPicker, type PickerVoucher } from "@/components/shop/voucher-picker";
import { RegionSelect } from "@/components/shop/region-select";
import { quoteShipping } from "@/lib/actions/shipping";
import type { ZoneQuote } from "@/lib/shipping-zone";
import type { ShippingRate } from "@/lib/biteship";

// Kontak & alamat pesanan terakhir, disimpan HANYA di perangkat pembeli
// (localStorage) setelah pesanan berhasil → checkout berikutnya terisi otomatis.
const SAVED_KEY = "snapfit.checkout.contact";

function loadSavedContact(): Partial<Fields> | null {
  try {
    const s = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "null");
    if (!s || typeof s !== "object") return null;
    const out: Partial<Fields> = {};
    for (const k of Object.keys(EMPTY) as (keyof Fields)[]) {
      if (typeof s[k] === "string") out[k] = s[k].slice(0, 300);
    }
    return out.name || out.phone ? out : null;
  } catch {
    return null;
  }
}

function saveContact(f: Fields) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(f));
  } catch {
    // abaikan storage yang tak tersedia
  }
}

/** Id acak per browser untuk draf checkout (satu draf per perangkat). */
function checkoutClientId(): string {
  const KEY = "snapfit.checkout.id";
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

type Fields = {
  name: string;
  phone: string;
  email: string;
  address: string;
  provinceCode: string;
  province: string;
  regencyCode: string;
  city: string; // nama kabupaten/kota
  districtCode: string;
  district: string;
  postalCode: string;
};

const EMPTY: Fields = {
  name: "", phone: "", email: "", address: "",
  provinceCode: "", province: "", regencyCode: "", city: "", districtCode: "", district: "",
  postalCode: "",
};

type Bank = { bank: string; accountNumber: string; accountName: string };

export function CheckoutView({
  manualPayment,
  flatShipping,
  bank,
  flatCost = 5000,
  freeShippingMin = 0,
  vouchers = [],
}: {
  manualPayment: boolean;
  flatShipping: boolean;
  bank: Bank;
  flatCost?: number;
  freeShippingMin?: number;
  vouchers?: PickerVoucher[];
}) {
  const router = useRouter();
  const { items, subtotal, hydrated, clear, voucher, setVoucher, note } = useCart();

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  async function onApplyVoucher(code?: string) {
    setVoucherApplying(true);
    setApplyingCode(code ?? null);
    setVoucherError(null);
    const res = await applyVoucher(code ?? voucherInput, subtotal, voucherShipping);
    if (res.ok) {
      setVoucher({ code: res.code, label: res.label, discount: res.discount, freeShipping: res.freeShipping });
      setVoucherInput("");
    } else {
      setVoucherError(res.error);
    }
    setVoucherApplying(false);
    setApplyingCode(null);
  }

  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [rates, setRates] = useState<ShippingRate[] | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [rateId, setRateId] = useState<string>("");

  const [placing, setPlacing] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const set = (k: keyof Fields, v: string) => setF((s) => ({ ...s, [k]: v }));

  // Ongkir per provinsi dihitung server (berat & harga dari DB) — sama dengan createOrder.
  const [quote, setQuote] = useState<ZoneQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const lineKey = items.map((i) => `${i.variantId}:${i.qty}`).join(",");
  useEffect(() => {
    if (!flatShipping || !f.provinceCode || !lineKey) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    quoteShipping({ provinceCode: f.provinceCode, items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) })
      .then((q) => alive && setQuote(q))
      .catch(() => alive && setQuote(null))
      .finally(() => alive && setQuoting(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatShipping, f.provinceCode, lineKey]);

  // Pelanggan lama di perangkat ini: isi otomatis dari pesanan terakhir.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    const saved = loadSavedContact();
    if (!saved) return;
    setF((cur) => (cur.name || cur.phone ? cur : { ...EMPTY, ...saved }));
    setPrefilled(true);
  }, []);
  function forgetContact() {
    try {
      localStorage.removeItem(SAVED_KEY);
    } catch {
      // abaikan
    }
    setF(EMPTY);
    setPrefilled(false);
  }

  const cartLines = items.map((i) => ({ variantId: i.variantId, qty: i.qty }));
  const selectedRate = rates?.find((r) => r.id === rateId) ?? null;
  const freeShip = flatShipping && freeShippingMin > 0 && subtotal >= freeShippingMin;
  // Mode flat: ongkir provinsi dari quote (belum pilih provinsi → belum diketahui, 0 di total).
  const shippingKnown = freeShip || (flatShipping ? !!quote : !!selectedRate);
  const shippingCost = freeShip ? 0 : flatShipping ? (quote?.cost ?? 0) : (selectedRate?.cost ?? 0);
  // Estimasi utk voucher gratis ongkir sebelum provinsi dipilih.
  const voucherShipping = freeShip ? 0 : flatShipping ? (quote?.cost ?? flatCost) : (selectedRate?.cost ?? 0);
  const discount = voucher?.discount ?? 0;
  const total = Math.max(0, subtotal + shippingCost - discount);

  const bcFired = useRef(false);
  useEffect(() => {
    if (bcFired.current || !hydrated || items.length === 0) return;
    bcFired.current = true;
    trackBeginCheckout(
      subtotal,
      items.map((i) => ({ item_id: i.variantId, item_name: i.name, price: i.price, quantity: i.qty })),
    );
  }, [hydrated, items, subtotal]);

  // Keranjang ditinggal: simpan draf (kontak + isi keranjang) setelah berhenti
  // mengetik — dipakai untuk email pengingat & daftar di admin.
  const lastDraft = useRef("");
  useEffect(() => {
    if (!hydrated || items.length === 0) return;
    const hasEmail = /^\S+@\S+\.\S+$/.test(f.email.trim());
    const hasPhone = f.phone.replace(/\D/g, "").length >= 10;
    if (!hasEmail && !hasPhone) return;
    const payload = {
      clientId: checkoutClientId(),
      name: f.name,
      email: hasEmail ? f.email : "",
      phone: hasPhone ? f.phone : "",
      items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    };
    const key = JSON.stringify(payload);
    if (key === lastDraft.current) return;
    const t = setTimeout(() => {
      lastDraft.current = key;
      saveCheckoutDraft(payload).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [hydrated, items, f.name, f.email, f.phone]);

  if (!hydrated) {
    return <div className="mt-8 h-40 rounded-lg border border-border bg-muted/50" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="mt-12 flex flex-col items-center py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-muted">
          <ShoppingBag className="size-7 text-muted-foreground" />
        </div>
        <h2 className="mt-5 text-lg font-medium">Keranjang kosong</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tambah produk dulu sebelum checkout.</p>
        <Button className="mt-6" asChild>
          <Link href="/produk">Lihat produk</Link>
        </Button>
      </div>
    );
  }

  async function checkRates() {
    setRatesError(null);
    if (!/^[0-9]{5}$/.test(f.postalCode)) {
      setErrors((e) => ({ ...e, postalCode: "Kode pos harus 5 digit" }));
      return;
    }
    setErrors((e) => ({ ...e, postalCode: "" }));
    setRatesLoading(true);
    setRates(null);
    setRateId("");
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postalCode: f.postalCode, items: cartLines }),
      });
      if (!res.ok) throw new Error("gagal");
      const data: { rates: ShippingRate[] } = await res.json();
      setRates(data.rates);
      if (data.rates[0]) setRateId(data.rates[0].id);
    } catch {
      setRatesError("Gagal mengambil ongkir. Coba lagi.");
    } finally {
      setRatesLoading(false);
    }
  }

  async function pay() {
    setPayError(null);
    const parsed = addressSchema.safeParse(f);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) fieldErrors[k] = v[0];
      }
      setErrors(fieldErrors);
      return;
    }
    if (!flatShipping && !rateId) {
      setRatesError("Pilih kurir dulu (cek ongkir).");
      return;
    }
    setErrors({});
    setPlacing(true);
    try {
      const result = await createOrder({ address: parsed.data, items: cartLines, rateId, voucherCode: voucher?.code, note });
      saveContact({ ...EMPTY, ...parsed.data, email: parsed.data.email ?? "" });
      if (result.manual) {
        // Transfer manual: order PENDING → arahkan ke halaman instruksi transfer.
        clear();
        router.push(`/checkout/sukses?order=${encodeURIComponent(result.midtransOrderId)}`);
      } else if (typeof window !== "undefined" && window.snap && result.snapToken) {
        const successUrl = `/checkout/sukses?order=${encodeURIComponent(result.midtransOrderId)}`;
        window.snap.pay(result.snapToken, {
          onSuccess: () => { clear(); router.push(successUrl); },
          onPending: () => { clear(); router.push(successUrl); },
          onError: () => setPayError("Pembayaran gagal. Coba lagi."),
          onClose: () => setPayError("Pembayaran dibatalkan."),
        });
      } else {
        setPayError("Snap.js belum termuat. Muat ulang halaman lalu coba lagi.");
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Gagal membuat order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-10">
      <div className="lg:col-span-2 space-y-8">
        <section>
          <h2 className="text-base font-medium">Alamat pengiriman</h2>
          {prefilled && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              Diisi dari pesanan terakhirmu di perangkat ini — periksa sebelum memesan.
              <button type="button" onClick={forgetContact} className="font-medium text-foreground underline underline-offset-2">
                Bukan kamu? Hapus
              </button>
            </p>
          )}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Nama" value={f.name} onChange={(v) => set("name", v)} error={errors.name} />
            <Field label="No. Telepon" value={f.phone} onChange={(v) => set("phone", v)} error={errors.phone} inputMode="tel" />
            <Field label="Email (opsional)" value={f.email} onChange={(v) => set("email", v)} error={errors.email} className="sm:col-span-2" />
            <Field label="Alamat lengkap" value={f.address} onChange={(v) => set("address", v)} error={errors.address} className="sm:col-span-2" textarea />
            <RegionSelect
              value={f}
              onChange={(v) => setF((s) => ({ ...s, ...v }))}
              errors={errors}
            />
            <Field label="Kode pos" value={f.postalCode} onChange={(v) => set("postalCode", v)} error={errors.postalCode} inputMode="numeric" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Kontakmu dipakai untuk info pesanan &amp; pengingat bila checkout belum selesai.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium">Pengiriman</h2>

          {flatShipping ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <span className="flex items-center gap-3">
                <Truck className="size-5 text-muted-foreground" />
                <span>
                  <span className="text-sm font-medium">{f.province ? `Ongkir ke ${f.province}` : "Ongkos kirim"}</span>
                  <span className="block text-xs text-muted-foreground">
                    {freeShip
                      ? `Gratis ongkir untuk belanja min. ${formatRupiah(freeShippingMin)}`
                      : !f.provinceCode
                        ? "Pilih provinsi di atas untuk menghitung ongkir"
                        : quoting
                          ? "Menghitung ongkir…"
                          : quote
                            ? `Berat ${quote.kg} kg${quote.etd ? ` · estimasi ${quote.etd}` : ""}`
                            : "Gagal menghitung ongkir — pilih ulang provinsi"}
                  </span>
                </span>
              </span>
              {freeShip ? (
                <span className="text-right">
                  {quote && quote.fullCost > 0 && <span className="block text-xs text-muted-foreground line-through">{formatRupiah(quote.fullCost)}</span>}
                  <span className="text-sm font-semibold text-emerald-700">GRATIS</span>
                </span>
              ) : quote ? (
                <span className="text-sm font-semibold">{formatRupiah(quote.cost)}</span>
              ) : (
                <span className="text-sm text-muted-foreground">{quoting ? <Loader2 className="size-4 animate-spin" /> : "—"}</span>
              )}
            </div>
          ) : null}
          {flatShipping && freeShippingMin > 0 && !freeShip && (
            <p className="mt-2 text-xs">
              Belanja <b>{formatRupiah(freeShippingMin - subtotal)}</b> lagi untuk <b>gratis ongkir</b>.
              <Link href="/produk" className="mt-1 block w-fit font-medium text-brand-ink underline underline-offset-2">Tambah produk →</Link>
            </p>
          )}
          {!flatShipping && (
            <>
              <div className="mt-1 flex justify-end">
                <Button variant="outline" size="sm" onClick={checkRates} disabled={ratesLoading}>
                  {ratesLoading && <Loader2 className="size-4 animate-spin" />}
                  Cek ongkir
                </Button>
              </div>
              {ratesError && <p className="mt-3 text-sm text-destructive">{ratesError}</p>}
              {rates && rates.length > 0 && (
                <div className="mt-4 space-y-2">
                  {rates.map((r) => (
                    <label
                      key={r.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                        rateId === r.id ? "border-foreground" : "border-border hover:border-foreground/50",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <input type="radio" name="rate" value={r.id} checked={rateId === r.id} onChange={() => setRateId(r.id)} className="accent-foreground" />
                        <span>
                          <span className="text-sm font-medium">{r.courierName} · {r.serviceName}</span>
                          <span className="block text-xs text-muted-foreground">Estimasi {r.etd}</span>
                        </span>
                      </span>
                      <span className="text-sm font-semibold">{formatRupiah(r.cost)}</span>
                    </label>
                  ))}
                </div>
              )}
              {!rates && !ratesLoading && (
                <p className="mt-3 text-sm text-muted-foreground">Isi kode pos lalu klik “Cek ongkir”.</p>
              )}
            </>
          )}
        </section>

        {manualPayment && (
          <section>
            <h2 className="text-base font-medium">Pembayaran</h2>
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium">Transfer Bank Manual</p>
              <p className="mt-1 text-muted-foreground">
                Setelah pesanan dibuat, transfer ke rekening <b>{bank.bank}</b> berikut. Pesanan
                diproses setelah pembayaran kami verifikasi.
              </p>
              <div className="mt-3 rounded-md border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">{bank.bank}</p>
                <p className="font-mono text-base font-semibold">{bank.accountNumber}</p>
                <p className="text-sm">a/n {bank.accountName}</p>
              </div>
            </div>
          </section>
        )}
      </div>

      <aside className="lg:col-span-1">
        <div className="rounded-lg border border-border p-5 lg:sticky lg:top-24">
          <h2 className="text-base font-medium">Ringkasan</h2>

          {/* Voucher */}
          <div className="mt-4">
            {voucher ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
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
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && onApplyVoucher()}
                    placeholder="Kode voucher"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase outline-none focus:border-foreground"
                  />
                  <Button size="sm" variant="outline" onClick={() => onApplyVoucher()} disabled={voucherApplying || !voucherInput.trim()}>
                    {voucherApplying && <Loader2 className="size-4 animate-spin" />}Pakai
                  </Button>
                </div>
                {voucherError && <p className="mt-1.5 text-xs text-destructive">{voucherError}</p>}
              </>
            )}
            <VoucherPicker
              vouchers={vouchers}
              subtotal={subtotal}
              shippingCost={voucherShipping}
              appliedCode={voucher?.code ?? null}
              applyingCode={applyingCode}
              onApply={(code) => onApplyVoucher(code)}
            />
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <Row label={`Subtotal (${items.length} produk)`} value={formatRupiah(subtotal)} />
            <Row
              label="Ongkir"
              value={freeShip ? "GRATIS" : shippingKnown ? formatRupiah(shippingCost) : "Pilih provinsi"}
              muted={!shippingKnown}
            />
            {discount > 0 && <Row label={`Voucher ${voucher?.code ?? ""}`} value={`−${formatRupiah(discount)}`} />}
            <div className="my-2 border-t border-border" />
            <Row label="Total" value={formatRupiah(total)} strong />
          </dl>
          {!shippingKnown && (
            <p className="mt-1 text-right text-xs text-muted-foreground">Belum termasuk ongkir — pilih provinsi tujuan.</p>
          )}

          <Button size="lg" className="mt-5 w-full" onClick={pay} disabled={placing}>
            {placing && <Loader2 className="size-4 animate-spin" />}
            {manualPayment ? "Buat pesanan" : "Bayar sekarang"}
          </Button>
          {payError && <p className="mt-3 text-sm text-destructive">{payError}</p>}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Total dihitung ulang & diamankan di server.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label, value, onChange, error, className, textarea, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string;
  className?: string; textarea?: boolean; inputMode?: "tel" | "numeric";
}) {
  const base = "mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-foreground";
  return (
    <label className={cn("block", className)}>
      <span className="text-sm font-medium">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cn(base, error ? "border-destructive" : "border-border")} />
      ) : (
        <input value={value} inputMode={inputMode} onChange={(e) => onChange(e.target.value)} className={cn(base, error ? "border-destructive" : "border-border")} />
      )}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn(strong ? "text-base font-semibold" : "font-medium")}>{value}</dd>
    </div>
  );
}
