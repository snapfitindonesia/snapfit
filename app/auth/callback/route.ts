import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendWelcomeIfNew } from "@/lib/welcome";

// Callback OAuth (Google dll) & tautan konfirmasi email: tukar `code` → sesi (cookie), lalu redirect.
// Akun baru → email selamat datang (sekali, lib/welcome.ts).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // hanya izinkan path internal (hindari open-redirect)
  const dest = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        await sendWelcomeIfNew(data.user);
        const sep = dest.includes("?") ? "&" : "?";
        return NextResponse.redirect(`${origin}${dest}${sep}login=success`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/masuk?reason=oauth`);
}
