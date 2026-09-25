import { db } from "@/lib/db";
import { LinktreeManager, type BioLinkRow } from "@/components/admin/linktree-manager";

export const dynamic = "force-dynamic";

export default async function AdminLinktreePage() {
  const [profile, links] = await Promise.all([
    db.bioProfile.findUnique({ where: { id: "main" } }),
    db.bioLink.findMany({ orderBy: { order: "asc" } }),
  ]);

  const rows: BioLinkRow[] = links.map((l) => ({
    id: l.id,
    title: l.title,
    url: l.url,
    image: l.image,
    highlight: l.highlight,
    active: l.active,
    clicks: l.clicks,
  }));

  return (
    <div>
      <h1 className="text-xl font-semibold">Linktree</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Halaman link-in-bio untuk Instagram/TikTok di{" "}
        <a href="/links" target="_blank" className="font-medium text-foreground hover:underline">snapfit.id/links</a>.
      </p>
      <div className="mt-6">
        <LinktreeManager
          links={rows}
          profile={{
            title: profile?.title ?? "SNAPFIT",
            bio: profile?.bio ?? "",
            avatar: profile?.avatar ?? "",
            instagram: profile?.instagram ?? "",
            tiktok: profile?.tiktok ?? "",
            whatsapp: profile?.whatsapp ?? "",
            shopee: profile?.shopee ?? "",
            tokopedia: profile?.tokopedia ?? "",
            youtube: profile?.youtube ?? "",
            facebook: profile?.facebook ?? "",
          }}
        />
      </div>
    </div>
  );
}
