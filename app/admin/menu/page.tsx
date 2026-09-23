import { db } from "@/lib/db";
import { NavLinkManager, type NavLinkRow } from "@/components/admin/nav-link-manager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  const links = await db.navLink.findMany({ orderBy: [{ location: "asc" }, { order: "asc" }] });
  const rows: NavLinkRow[] = links.map((l) => ({
    id: l.id,
    label: l.label,
    url: l.url,
    location: l.location as "HEADER" | "FOOTER",
    order: l.order,
    newTab: l.newTab,
    active: l.active,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Menu & Link Custom</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tambah link sendiri di <b>Header</b> (nav atas) atau <b>Footer</b>. URL bisa internal (mis. <code>/grosir</code>) atau eksternal (<code>https://…</code>).
      </p>
      <div className="mt-6">
        <NavLinkManager rows={rows} />
      </div>
    </div>
  );
}
