import { z } from "zod";

// Warna situs (Admin → Tampilan Toko → Warna Situs). Murni (tanpa DB) — dipakai server & form admin.
// Disuntikkan sebagai variabel CSS di app/layout.tsx (menimpa nilai bawaan di styles/globals.css).

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format #RRGGBB");

export const themeColorsSchema = z.object({
  background: hex, // latar semua halaman
  card: hex, // kartu, panel, keranjang, popup
  foreground: hex, // teks utama
  primary: hex, // tombol utama
  brand: hex, // aksen oranye
});
export type ThemeColors = z.infer<typeof themeColorsSchema>;

export const DEFAULT_THEME_COLORS: ThemeColors = {
  background: "#fffefa",
  card: "#ffffff",
  foreground: "#0a0a0a",
  primary: "#171717",
  brand: "#f26522",
};

export function normalizeThemeColors(raw: unknown): ThemeColors {
  const r = themeColorsSchema.partial().safeParse(raw);
  return { ...DEFAULT_THEME_COLORS, ...(r.success ? r.data : {}) };
}

/** Teks di atas warna `bg`: putih atau hitam, mana yang lebih kontras (WCAG luminance). */
export function readableOn(bg: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(bg.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (1.05) / (L + 0.05) >= (L + 0.05) / 0.05 ? "#ffffff" : "#0a0a0a";
}

/** CSS :root yang menimpa token tema (kosong bila semua bawaan). */
export function themeCss(c: ThemeColors): string {
  const d = DEFAULT_THEME_COLORS;
  if (JSON.stringify(c) === JSON.stringify(d)) return "";
  const v: Record<string, string> = {
    "--background": c.background,
    "--foreground": c.foreground,
    "--card": c.card,
    "--card-foreground": c.foreground,
    "--popover": c.card,
    "--popover-foreground": c.foreground,
    "--primary": c.primary,
    "--primary-foreground": readableOn(c.primary),
    "--brand": c.brand,
    "--brand-foreground": readableOn(c.brand),
  };
  return `:root{${Object.entries(v).map(([k, val]) => `${k}:${val}`).join(";")}}`;
}
