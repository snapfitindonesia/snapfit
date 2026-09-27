import { Suspense } from "react";
import { CartView } from "@/components/shop/cart-view";
import { CartRestore } from "@/components/shop/cart-restore";

export const metadata = {
  title: "Keranjang",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Keranjang
      </h1>
      {/* Pulihkan keranjang dari tautan pengingat (?pulih=token) */}
      <Suspense>
        <CartRestore />
      </Suspense>
      <CartView />
    </div>
  );
}
