import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma tanpa mesin Rust (engineType = "client", lihat prisma/schema.prisma): koneksi lewat
// driver `pg` ke pooler Supabase (DATABASE_URL, :6543 mode transaksi). Pool kecil per instance
// serverless — pooler Supabase yang membagi koneksi ke Postgres.
function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 5 });
  return new PrismaClient({ adapter });
}

// Singleton — hindari bikin koneksi baru tiap hot-reload di dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
