import { PrismaClient } from "@prisma/client";

// Singleton Prisma client — hindari bikin koneksi baru tiap hot-reload di dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
