import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { MobileBottomBar } from "@/components/shop/mobile-bottom-bar";
import { CartProvider } from "@/components/shop/cart-provider";
import { StoreUIProvider } from "@/components/shop/store-ui-provider";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { LoginModal } from "@/components/shop/login-modal";
import { AuthToast } from "@/components/shop/auth-toast";
import { PopupBanner } from "@/components/shop/popup-banner";
import { getPopupBanner } from "@/lib/actions/product";
import { isFlatShipping, FLAT_SHIPPING_COST, FREE_SHIPPING_MIN } from "@/lib/payment";
import { Suspense } from "react";

// Tetap statis/cepat: status login dideteksi di client (StoreUIProvider),
// tanpa round-trip Supabase per request seperti dulu.
export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const popupBanner = await getPopupBanner();
  return (
    <CartProvider>
      <StoreUIProvider>
        {/* pb mobile: ruang untuk sticky bottom bar + safe-area di PALING BAWAH
            (setelah footer) — kalau di <main>, baris terakhir footer tertutup bar. */}
        <div className="flex min-h-dvh flex-col pb-[calc(4rem+var(--mobile-extra-bar,0px)+env(safe-area-inset-bottom))] md:pb-0">
          <SiteHeader />
          <main className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <MobileBottomBar />
        </div>
        <CartDrawer flatShipping={isFlatShipping()} flatCost={FLAT_SHIPPING_COST} freeShippingMin={FREE_SHIPPING_MIN} />
        <PopupBanner banner={popupBanner} />
        <LoginModal />
        <Suspense>
          <AuthToast />
        </Suspense>
      </StoreUIProvider>
    </CartProvider>
  );
}
