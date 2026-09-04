"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/** Supabase client sisi browser. Null bila auth belum dikonfigurasi. */
export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
