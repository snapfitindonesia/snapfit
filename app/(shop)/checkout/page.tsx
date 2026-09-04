import { CheckoutView } from "@/components/shop/checkout-view";
import { SnapScript } from "@/components/shop/snap-script";

export const metadata = {
  title: "Checkout — SnapFit",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-32 sm:px-6 sm:py-12 md:pb-12">
      <SnapScript />
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1>
      <CheckoutView />
    </div>
  );
}
