"use server";

import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { credentialsSchema, type Credentials } from "@/lib/validations/auth";

type AuthResult = { ok: boolean; error?: string; message?: string };

// Error SELALU generic (docs/06): jangan bocorkan apakah email terdaftar.
const GENERIC = "Email atau password salah.";

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function signIn(input: Credentials): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: GENERIC };

  const okCaptcha = await verifyTurnstile(
    parsed.data.turnstileToken ?? null,
    await clientIp(),
  );
  if (!okCaptcha) return { ok: false, error: "Verifikasi keamanan gagal." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Auth belum dikonfigurasi." };

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: GENERIC };
  return { ok: true };
}

export async function signUp(input: Credentials): Promise<AuthResult> {
  const parsed = credentialsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }

  const okCaptcha = await verifyTurnstile(
    parsed.data.turnstileToken ?? null,
    await clientIp(),
  );
  if (!okCaptcha) return { ok: false, error: "Verifikasi keamanan gagal." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Auth belum dikonfigurasi." };

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // Pesan netral (jangan konfirmasi email terdaftar/tidak)
  if (error) return { ok: false, error: "Tidak bisa mendaftar. Coba lagi." };
  return {
    ok: true,
    message: "Cek email kamu untuk konfirmasi (bila diaktifkan).",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
}
