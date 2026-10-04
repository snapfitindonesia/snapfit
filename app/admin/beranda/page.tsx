import { getHomeSectionsFresh } from "@/lib/home/data";
import { HomeEditor } from "@/components/admin/home-editor";

export const dynamic = "force-dynamic";

export default async function AdminBerandaPage() {
  const sections = await getHomeSectionsFresh();
  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold">Konten Beranda</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Susun beranda dari bagian-bagian: klik bagian untuk mengedit, ubah urutan dengan panah, sembunyikan dengan ikon mata.
        Bagian bertanda <b>selebar layar</b> tampil dari tepi ke tepi. Perubahan tampil setelah klik <b>Simpan</b>.
      </p>
      <div className="mt-6">
        <HomeEditor initial={sections} />
      </div>
    </div>
  );
}
