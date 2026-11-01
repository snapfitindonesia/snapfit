import { Suspense } from "react";
import { CartProvider } from "@/components/shop/cart-provider";
import { StoreUIProvider } from "@/components/shop/store-ui-provider";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { LoginModal } from "@/components/shop/login-modal";
import { AuthToast } from "@/components/shop/auth-toast";
import { isFlatShipping, FLAT_SHIPPING_COST, FREE_SHIPPING_MIN, FREE_SHIPPING_MAX } from "@/lib/payment";
import { zoneStartingCost } from "@/lib/shipping-zone";

// /buy1get1 punya header, footer & menu bawah SENDIRI (desain paket, components/promo-page) → sengaja di LUAR
// grup (shop) agar header/footer/menu bawah toko tidak tampil rangkap. Keranjang, login & toast tetap sama
// dengan toko (provider yang sama) → keranjang dari halaman ini = keranjang toko.
export default async function PromoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <StoreUIProvider>
        {children}
        <CartDrawer
          flatShipping={isFlatShipping()}
          flatCost={FLAT_SHIPPING_COST}
          freeShippingMin={FREE_SHIPPING_MIN}
          freeShippingMax={FREE_SHIPPING_MAX}
          zoneFrom={await zoneStartingCost().catch(() => null)}
        />
        <LoginModal />
        <Suspense>
          <AuthToast />
        </Suspense>
      </StoreUIProvider>
    </CartProvider>
  );
}
