import { getThemeColors } from "@/lib/theme-settings";
import { ThemeColorsForm } from "@/components/admin/theme-colors-form";

export const dynamic = "force-dynamic";

export default async function AdminThemePage() {
  const colors = await getThemeColors();
  return (
    <div>
      <h1 className="text-xl font-semibold">Warna Situs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ganti warna latar, kartu, teks, tombol, dan aksen untuk seluruh toko. Pratinjau di kanan berubah langsung; klik Simpan untuk
        menerapkan.
      </p>
      <div className="mt-6">
        <ThemeColorsForm initial={colors} />
      </div>
    </div>
  );
}
