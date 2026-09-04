import { db } from "@/lib/db";
import { BannerManager } from "@/components/admin/banner-manager";

export const dynamic = "force-dynamic";

export default async function AdminBannerPage() {
  const banners = await db.banner.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
  return (
    <div>
      <h1 className="text-xl font-semibold">Banner</h1>
      <div className="mt-6">
        <BannerManager banners={banners} />
      </div>
    </div>
  );
}
