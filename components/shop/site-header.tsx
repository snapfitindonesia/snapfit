import { getMegaMenu, getMerekMenu, getNavLinks } from "@/lib/actions/product";
import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { HeaderNav } from "@/components/shop/header-nav";

export async function SiteHeader() {
  const [menu, merekMenu, navLinks] = await Promise.all([
    getMegaMenu(),
    getMerekMenu(),
    getNavLinks("HEADER"),
  ]);
  return (
    <>
      <AnnouncementBar />
      <HeaderNav menu={menu} merekMenu={merekMenu} navLinks={navLinks} />
    </>
  );
}
