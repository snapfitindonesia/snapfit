import Link from "next/link";
import { db } from "@/lib/db";
import { BannerManager } from "@/components/admin/banner-manager";

export const dynamic = "force-dynamic";

export default async function AdminBannerPage() {
  const banners = await db.banner.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
  return (
    <div>
      <h1 className="text-xl font-semibold">Banner</h1>
      <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
        Beranda sekarang diatur di{" "}
        <Link href="/admin/beranda" className="font-medium underline underline-offset-2">Konten Beranda</Link>. Banner <b>MAIN</b>,{" "}
        <b>PROMO</b>, dan <b>ETALASE</b> di sini tidak tampil lagi — yang masih dipakai hanya <b>POPUP</b>.
      </p>
      <div className="mt-6">
        <BannerManager banners={banners} />
      </div>
    </div>
  );
}
