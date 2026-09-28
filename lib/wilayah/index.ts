// Data wilayah Indonesia (kode Kepmendagri) — dibangun oleh scripts/build-wilayah.mjs.
// provinces.json kecil (38 baris) → ikut bundle; kab/kota + kecamatan per provinsi
// diunduh saat dipilih dari /wilayah/<kode>.json (file statis CDN).
import provincesData from "./provinces.json";

export type Province = { code: string; name: string };
export type RegionFile = { c: string; n: string; r: { c: string; n: string; d: [string, string][] }[] };

export const PROVINCES: Province[] = provincesData;

export const provinceName = (code: string) => PROVINCES.find((p) => p.code === code)?.name ?? null;

/** Kelompok pulau (untuk isi cepat tarif di admin). Kunci = 2 digit awal kode provinsi. */
export const ISLAND_GROUPS: { id: string; label: string; codes: string[] }[] = [
  { id: "jawa", label: "Jawa", codes: ["31", "32", "33", "34", "35", "36"] },
  { id: "sumatera", label: "Sumatera", codes: ["11", "12", "13", "14", "15", "16", "17", "18", "19", "21"] },
  { id: "bali-nusa", label: "Bali & Nusa Tenggara", codes: ["51", "52", "53"] },
  { id: "kalimantan", label: "Kalimantan", codes: ["61", "62", "63", "64", "65"] },
  { id: "sulawesi", label: "Sulawesi", codes: ["71", "72", "73", "74", "75", "76"] },
  { id: "maluku-papua", label: "Maluku & Papua", codes: ["81", "82", "91", "92", "93", "94", "95", "96"] },
];
