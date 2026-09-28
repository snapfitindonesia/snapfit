"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { PROVINCES, type RegionFile } from "@/lib/wilayah";

export type RegionValue = {
  provinceCode: string;
  province: string;
  regencyCode: string;
  city: string; // nama kabupaten/kota
  districtCode: string;
  district: string;
};

export const EMPTY_REGION: RegionValue = { provinceCode: "", province: "", regencyCode: "", city: "", districtCode: "", district: "" };

// Data per provinsi diunduh sekali per sesi (±2–15 KB, file statis CDN).
const cache = new Map<string, Promise<RegionFile>>();
function loadProvince(code: string): Promise<RegionFile> {
  if (!cache.has(code)) {
    cache.set(
      code,
      fetch(`/wilayah/${code}.json`).then((r) => {
        if (!r.ok) throw new Error("gagal");
        return r.json();
      }),
    );
  }
  return cache.get(code)!.catch((e) => {
    cache.delete(code); // izinkan coba lagi
    throw e;
  });
}

/** Dropdown Provinsi → Kabupaten/Kota → Kecamatan (kode Kepmendagri). */
export function RegionSelect({
  value,
  onChange,
  errors = {},
}: {
  value: RegionValue;
  onChange: (v: RegionValue) => void;
  errors?: Partial<Record<keyof RegionValue, string>>;
}) {
  const [data, setData] = useState<RegionFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!value.provinceCode) {
      setData(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setFailed(false);
    loadProvince(value.provinceCode)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [value.provinceCode]);

  const regency = data?.r.find((r) => r.c === value.regencyCode) ?? null;

  const base = "mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-foreground disabled:bg-muted/40 disabled:text-muted-foreground";
  const err = (k: keyof RegionValue) => errors[k];

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
      <label className="block">
        <span className="text-sm font-medium">Provinsi</span>
        <select
          value={value.provinceCode}
          onChange={(e) => {
            const p = PROVINCES.find((x) => x.code === e.target.value);
            onChange({ ...EMPTY_REGION, provinceCode: p?.code ?? "", province: p?.name ?? "" });
          }}
          className={cn(base, err("provinceCode") ? "border-destructive" : "border-border")}
        >
          <option value="">Pilih provinsi</option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>{p.name}</option>
          ))}
        </select>
        {err("provinceCode") && <span className="mt-1 block text-xs text-destructive">{err("provinceCode")}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Kabupaten/Kota</span>
        <select
          value={regency ? value.regencyCode : ""}
          disabled={!data}
          onChange={(e) => {
            const r = data?.r.find((x) => x.c === e.target.value);
            onChange({ ...value, regencyCode: r?.c ?? "", city: r?.n ?? "", districtCode: "", district: "" });
          }}
          className={cn(base, err("regencyCode") || err("city") ? "border-destructive" : "border-border")}
        >
          <option value="">{loading ? "Memuat…" : failed ? "Gagal memuat — pilih ulang provinsi" : "Pilih kabupaten/kota"}</option>
          {data?.r.map((r) => (
            <option key={r.c} value={r.c}>{r.n}</option>
          ))}
        </select>
        {(err("regencyCode") || err("city")) && <span className="mt-1 block text-xs text-destructive">{err("regencyCode") || err("city")}</span>}
      </label>

      <label className="block">
        <span className="text-sm font-medium">Kecamatan</span>
        <select
          value={regency?.d.some(([c]) => c === value.districtCode) ? value.districtCode : ""}
          disabled={!regency}
          onChange={(e) => {
            const d = regency?.d.find(([c]) => c === e.target.value);
            onChange({ ...value, districtCode: d?.[0] ?? "", district: d?.[1] ?? "" });
          }}
          className={cn(base, err("districtCode") || err("district") ? "border-destructive" : "border-border")}
        >
          <option value="">Pilih kecamatan</option>
          {regency?.d.map(([c, n]) => (
            <option key={c} value={c}>{n}</option>
          ))}
        </select>
        {(err("districtCode") || err("district")) && <span className="mt-1 block text-xs text-destructive">{err("districtCode") || err("district")}</span>}
      </label>
    </div>
  );
}
