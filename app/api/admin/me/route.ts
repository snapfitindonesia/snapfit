import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

/**
 * Apakah pengunjung yang login adalah admin? Dipakai tombol "Edit produk" di halaman toko
 * (components/shop/admin-edit-link.tsx). Hanya mengembalikan ya/tidak — halaman admin sendiri tetap
 * dijaga middleware (login + role + MFA bila aktif).
 */
export async function GET() {
  const r = await checkAdmin({ skipMfa: true });
  return NextResponse.json({ admin: r.ok }, { headers: { "Cache-Control": "private, no-store" } });
}
