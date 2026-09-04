import { getMegaMenu } from "@/lib/actions/product";
import { AnnouncementBar } from "@/components/shop/announcement-bar";
import { HeaderNav } from "@/components/shop/header-nav";

export async function SiteHeader() {
  const menu = await getMegaMenu();
  return (
    <>
      <AnnouncementBar />
      <HeaderNav menu={menu} />
    </>
  );
}
