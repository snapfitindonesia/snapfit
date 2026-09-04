// Tukar datasource Prisma antara SQLite (dev lokal) dan Postgres (produksi/Supabase).
// Pakai: node scripts/switch-db.mjs sqlite | postgres
// Atau:  npm run db:use-sqlite | npm run db:use-postgres
//
// Ini HANYA mengganti blok `datasource db {...}` di prisma/schema.prisma — model tetap sama.
// Setelah pindah ke postgres: isi DATABASE_URL (pooled) + DIRECT_URL (direct) di .env,
// lalu buat migration Postgres baru:  rm -rf prisma/migrations && npx prisma migrate dev --name init_postgres
// (migration SQLite lama tidak kompatibel Postgres).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const target = process.argv[2];
if (target !== "sqlite" && target !== "postgres") {
  console.error("Pakai: node scripts/switch-db.mjs <sqlite|postgres>");
  process.exit(1);
}

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");

const BLOCKS = {
  sqlite: `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`,
  postgres: `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL") // pooled (runtime) — Supabase :6543
  directUrl = env("DIRECT_URL")   // direct (migrate) — Supabase :5432
}`,
};

const schema = readFileSync(schemaPath, "utf8");
const next = schema.replace(/datasource db \{[\s\S]*?\n\}/, BLOCKS[target]);

if (next === schema && !schema.includes(BLOCKS[target])) {
  console.error("Gagal: blok `datasource db {...}` tak ditemukan di schema.prisma");
  process.exit(1);
}

writeFileSync(schemaPath, next);
console.log(`✔ datasource → ${target}`);
if (target === "postgres") {
  console.log("Berikutnya: isi DATABASE_URL + DIRECT_URL di .env, lalu:");
  console.log("  rm -rf prisma/migrations && npx prisma migrate dev --name init_postgres");
  console.log("  npm run db:seed   # opsional");
}
