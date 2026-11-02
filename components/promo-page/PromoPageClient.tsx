"use client";

// Adapter paket → fitur website (sesuai examples/FashionPageAdapter paket): router Next, keranjang (drawer),
// login/akun, newsletter, bantuan WhatsApp. Callback dibuat DI SINI (client), bukan dikirim dari server.
import { useRouter } from "next/navigation";
import PromoPage, { type PromoAction, type PromoProduct } from "@/components/promo-page/PromoPage";
import { useStoreUI } from "@/components/shop/store-ui-provider";
import { subscribeNewsletter } from "@/lib/actions/newsletter";
import { waChatUrl } from "@/lib/contact";
import type { PromoPageConfig } from "@/lib/promo-page/config";
import type { PromoMenu } from "@/lib/promo-page/menu";

export function PromoPageClient(props: {
  config: PromoPageConfig;
  menu: PromoMenu;
  logoSrc: string;
  markSrc: string;
  homeHref: string;
  products: PromoProduct[];
}) {
  const router = useRouter();
  const { authed, openCart, openLogin, cartOpen, loginOpen } = useStoreUI();

  const onAction = (action: PromoAction): boolean => {
    switch (action) {
      case "cart":
        openCart(); // drawer keranjang yang sama dengan toko
        return true;
      case "account":
        if (authed) router.push("/akun");
        else openLogin();
        return true;
      case "returns":
        router.push("/bantuan#pengembalian");
        return true;
      case "help":
        window.open(waChatUrl("Halo SNAPFIT, saya mau tanya promo Buy 1 Get 1:"), "_blank", "noopener,noreferrer");
        return true;
      case "app":
        return false;
      case "wishlist":
        return false; // belum ada fitur wishlist → info "segera hadir"
    }
  };

  return (
    <PromoPage
      {...props}
      navigate={(href) => (/^https?:\/\//i.test(href) ? window.location.assign(href) : router.push(href))}
      onAction={onAction}
      overlayOpen={cartOpen || loginOpen}
      onNewsletterSubmit={async (email) => {
        const r = await subscribeNewsletter({ email, sectionId: "buy1get1" });
        if (!r.ok) throw new Error(r.error ?? "Gagal");
      }}
    />
  );
}
