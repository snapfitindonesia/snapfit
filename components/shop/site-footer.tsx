import { getNavLinks } from "@/lib/actions/product";
import { FOOTER_COLUMNS, FooterView } from "@/components/shop/footer-view";

export async function SiteFooter() {
  const custom = await getNavLinks("FOOTER");
  const columns = custom.length
    ? [...FOOTER_COLUMNS, { title: "Menu", links: custom.map((l) => ({ label: l.label, href: l.url, newTab: l.newTab })) }]
    : FOOTER_COLUMNS;
  return <FooterView columns={columns} />;
}
