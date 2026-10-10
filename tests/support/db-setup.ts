// Disiapkan sebelum SETIAP file tes kelompok "db" (vitest.config.ts):
// 1) Postgres SEMENTARA di memori (PGlite) khusus file ini — WAJIB localhost; produksi tak pernah tersentuh.
// 2) Pengganti untuk hal yang hanya ada di dalam server Next yang berjalan (request, cache, login).
// 3) Layanan luar dimatikan: email (mock), Ginee, Upstash, Midtrans → tak ada yang terkirim keluar.
import { afterAll, inject, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const pg = await PGlite.create();
await pg.exec(inject("schemaSql"));
const port = 55_000 + Math.floor(Math.random() * 5_000);
const server = new PGLiteSocketServer({ db: pg, port, host: "127.0.0.1" });
await server.start();
process.env.DATABASE_URL = `postgresql://postgres@127.0.0.1:${port}/postgres?sslmode=disable`;
process.env.DATABASE_POOL_MAX = "1"; // PGlite: satu koneksi
for (const k of ["RESEND_API_KEY", "GINEE_ACCESS_KEY", "GINEE_SECRET_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "MIDTRANS_SERVER_KEY", "PAYMENT_MODE", "SHIPPING_MODE"]) {
  process.env[k] = "";
}
process.env.FREE_SHIPPING_MIN = "0";
process.env.SHIPPING_FLAT_COST = "5000";

/** Pekerjaan `after()` (email, Ginee) dijalankan & ditunggu di tes lewat flushAfter(). */
const pendingAfter: Promise<unknown>[] = [];
(globalThis as { __flushAfter?: () => Promise<void> }).__flushAfter = async () => {
  while (pendingAfter.length) await Promise.allSettled(pendingAfter.splice(0));
};

vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (fn: (() => unknown) | Promise<unknown>) => {
    pendingAfter.push(Promise.resolve().then(() => (typeof fn === "function" ? fn() : fn)));
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => {},
  revalidatePath: () => {},
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
  cookies: async () => ({ getAll: () => [], get: () => undefined, set: () => {} }),
}));

/** Pengguna login (untuk tes koin) — null = tamu. Diatur lewat setTestUser(). */
let currentUser: { id: string; email?: string } | null = null;
(globalThis as { __setTestUser?: (u: typeof currentUser) => void }).__setTestUser = (u) => {
  currentUser = u;
};
vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: async () => currentUser,
  createSupabaseServerClient: async () => null,
}));

vi.mock("@/lib/auth/require-admin", () => ({
  isAdminDevBypass: () => true,
  checkAdmin: async () => ({ ok: true }),
  requireAdmin: async () => {},
}));

// Akhir file: tutup koneksi Prisma & database sementara.
afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
  (globalThis as { prisma?: unknown }).prisma = undefined;
  await server.stop();
  await pg.close();
});
