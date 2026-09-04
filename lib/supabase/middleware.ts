import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";
import type { User } from "@supabase/supabase-js";

export type SessionResult = {
  response: NextResponse;
  user: User | null;
  aal: string | null; // "aal1" | "aal2" | null
};

/** Refresh sesi Supabase di middleware (wajib agar cookie sesi tetap segar). */
export async function updateSession(request: NextRequest): Promise<SessionResult> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { response, user: null, aal: null };
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Cek AAL (MFA) hanya kalau MFA diwajibkan — hemat 1 round-trip ke Supabase
  // pada tiap request saat MFA tak dipakai.
  let aal: string | null = null;
  if (user && process.env.ADMIN_REQUIRE_MFA === "true") {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    aal = data?.currentLevel ?? null;
  }

  return { response, user, aal };
}
