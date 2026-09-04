import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { limitLogin } from "@/lib/security/ratelimit";
import { isSupabaseConfigured, ADMIN_ROLE } from "@/lib/supabase/config";

const LOGIN_PATHS = ["/masuk", "/daftar", "/api/auth"];

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => to.cookies.set(c));
  return to;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // 1) Rate-limit HANYA percobaan login (POST ke route login), bukan buka halaman.
  if (
    request.method === "POST" &&
    LOGIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    const { success } = await limitLogin(ip);
    if (!success) {
      return new NextResponse(
        "Terlalu banyak percobaan. Coba lagi nanti.",
        { status: 429 },
      );
    }
  }

  // 2) Refresh sesi Supabase (wajib agar cookie tetap segar)
  const { response, user, aal } = await updateSession(request);

  // 3) Gate admin (crown jewel) — fail-closed
  //    DEV-ONLY bypass utk membangun dashboard tanpa Supabase. Di produksi
  //    (NODE_ENV=production) selalu OFF — tak bisa diaktifkan.
  const devBypass =
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "true";

  if (pathname.startsWith("/admin") && !devBypass) {
    // Auth belum dikonfigurasi → kunci total
    if (!isSupabaseConfigured()) {
      return copyCookies(
        response,
        NextResponse.redirect(new URL("/masuk?reason=locked", request.url)),
      );
    }
    // Harus login
    if (!user) {
      const url = new URL("/masuk", request.url);
      url.searchParams.set("next", pathname);
      return copyCookies(response, NextResponse.redirect(url));
    }
    // Harus role admin
    const role = (user.app_metadata as { role?: string } | undefined)?.role;
    if (role !== ADMIN_ROLE) {
      return copyCookies(
        response,
        NextResponse.redirect(new URL("/?reason=forbidden", request.url)),
      );
    }
    // Wajib MFA (AAL2) — HANYA kalau ADMIN_REQUIRE_MFA=true; kecuali halaman MFA sendiri
    if (
      process.env.ADMIN_REQUIRE_MFA === "true" &&
      pathname !== "/admin/mfa" &&
      aal !== "aal2"
    ) {
      return copyCookies(
        response,
        NextResponse.redirect(new URL("/admin/mfa", request.url)),
      );
    }
  }

  return response;
}

export const config = {
  // HANYA route yang butuh auth/proteksi. Storefront (/, /produk, dll) TIDAK menjalankan
  // middleware → tak ada round-trip Supabase per request → jauh lebih cepat.
  matcher: [
    "/admin/:path*",
    "/akun/:path*",
    "/masuk",
    "/daftar",
    "/checkout/:path*",
    "/api/auth/:path*",
    "/api/admin/:path*",
  ],
};
