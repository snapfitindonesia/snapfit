import { getMegaMenu, getNavLinks } from "@/lib/actions/product";
import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { HeaderNav } from "@/components/shop/header-nav";

export async function SiteHeader() {
  const [menu, navLinks] = await Promise.all([getMegaMenu(), getNavLinks("HEADER")]);
  return (
    <>
      <AnnouncementBar />
      <HeaderNav menu={menu} navLinks={navLinks} />
    </>
  );
}
