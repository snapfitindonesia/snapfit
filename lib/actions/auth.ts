"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { limitAction, limitLogin } from "@/lib/security/ratelimit";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { credentialsSchema, type Credentials } from "@/lib/validations/auth";
import { sendWelcomeIfNew } from "@/lib/welcome";

type AuthResult = { ok: boolean; error?: string; message?: string; needsOtp?: boolean };

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

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // Tautan konfirmasi → /auth/callback (sesi + email selamat datang), lalu ke Akun.
    options: { emailRedirectTo: `${site}/auth/callback?next=/akun` },
  });
  // Pesan netral (jangan konfirmasi email terdaftar/tidak)
  if (error) return { ok: false, error: "Tidak bisa mendaftar. Coba lagi." };
  // Konfirmasi email dimatikan di Supabase → langsung aktif → kirim sekarang.
  if (data.session) {
    await sendWelcomeIfNew(data.user);
    return { ok: true, message: "Akun dibuat — kamu sudah masuk." };
  }
  // Konfirmasi aktif → email berisi kode OTP 6 digit (template Supabase "Confirm signup" memakai
  // {{ .Token }}; tautan {{ .ConfirmationURL }} tetap berfungsi lewat /auth/callback).
  return { ok: true, needsOtp: true, message: "Kami mengirim kode 6 digit ke emailmu." };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
}

// Hapus akun sendiri (hanya user yang sedang login). Pesanan tetap tersimpan
// untuk pembukuan, tapi tak lagi tertaut ke akun.
export async function deleteMyAccount(): Promise<AuthResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Kamu belum login." };

  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, error: "Hapus akun belum tersedia." };

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: "Gagal menghapus akun. Coba lagi." };

  // akhiri sesi
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
  return { ok: true };
}

const otpSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().trim().regex(/^\d{6,10}$/, "Kode berupa 6 digit angka."),
});

/** Verifikasi kode OTP daftar manual → akun aktif + langsung masuk (cookie sesi) + email selamat datang. */
export async function verifySignupOtp(input: { email: string; code: string }): Promise<AuthResult> {
  const parsed = otpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Kode tidak valid." };
  // Anti tebak kode: maks 5 percobaan/menit/IP (+ limit bawaan Supabase).
  const { success } = await limitLogin(await clientIp());
  if (!success) return { ok: false, error: "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Auth belum dikonfigurasi." };
  const { email, code } = parsed.data;
  let { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) ({ data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "signup" }));
  if (error || !data.user) return { ok: false, error: "Kode salah atau sudah kedaluwarsa. Minta kode baru." };
  await sendWelcomeIfNew(data.user);
  return { ok: true };
}

/** Kirim ulang email kode OTP daftar (Supabase membatasi ±1 per 60 detik per email). */
export async function resendSignupOtp(email: string): Promise<AuthResult> {
  const parsed = z.string().trim().email().safeParse(email);
  if (!parsed.success) return { ok: false, error: "Email tidak valid." };
  const { success } = await limitAction("otp-resend", await clientIp(), 3, "10 m");
  if (!success) return { ok: false, error: "Terlalu sering. Coba lagi beberapa menit lagi." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Auth belum dikonfigurasi." };
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.snapfit.id").replace(/\/$/, "");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${site}/auth/callback?next=/akun` },
  });
  // Pesan netral (jangan bocorkan status email)
  if (error) return { ok: false, error: "Belum bisa mengirim ulang. Tunggu 1 menit lalu coba lagi." };
  return { ok: true, message: "Kode baru sudah dikirim." };
}
