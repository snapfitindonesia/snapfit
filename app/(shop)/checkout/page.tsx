import { CheckoutView } from "@/components/shop/checkout-view";
import { SnapScript } from "@/components/shop/snap-script";
import { getActiveVouchers } from "@/lib/actions/voucher";
import { isManualPayment, isFlatShipping, MANUAL_BANK, FLAT_SHIPPING_COST, FREE_SHIPPING_MIN, FREE_SHIPPING_MAX } from "@/lib/payment";

export const metadata = {
  title: "Checkout",
};

// Voucher aktif dimuat di server; cache 5 menit.
export const revalidate = 300;

export default async function CheckoutPage() {
  const vouchers = await getActiveVouchers();
  const manualPayment = isManualPayment();
  const flatShipping = isFlatShipping();

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-8 pb-32 sm:px-6 lg:px-10 sm:py-12 md:pb-12">
      {/* Snap.js hanya dimuat saat Midtrans aktif */}
      {!manualPayment && <SnapScript />}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1>
      <CheckoutView manualPayment={manualPayment} flatShipping={flatShipping} bank={MANUAL_BANK} flatCost={FLAT_SHIPPING_COST} freeShippingMin={FREE_SHIPPING_MIN} freeShippingMax={FREE_SHIPPING_MAX} vouchers={vouchers} />
    </div>
  );
}
