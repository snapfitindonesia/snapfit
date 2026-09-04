import { SiteHeader } from "@/components/shop/site-header";
import { SiteFooter } from "@/components/shop/site-footer";
import { MobileBottomBar } from "@/components/shop/mobile-bottom-bar";
import { CartProvider } from "@/components/shop/cart-provider";

export default function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        {/* pb mobile: ruang untuk sticky bottom bar + safe-area (lihat 02-design-system.md) */}
        <main className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <SiteFooter />
        <MobileBottomBar />
      </div>
    </CartProvider>
  );
}
