import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL("./", import.meta.url));
const alias = {
  "@": root,
  // `server-only` sengaja melempar error di luar Next (React Server) — di tes, modul server boleh diimpor.
  "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)),
};

// Dua kelompok tes (jalankan: npm test):
// - unit: logika murni (uang, stok, ongkir, voucher, koin, CSV) — cepat, tanpa database.
// - db:   alur nyata ke database (buat pesanan, bayar, batal, stok, Edit Massal, backup) pada Postgres
//         SEMENTARA di memori (PGlite, tests/support/pg-global.ts) — database produksi tak pernah tersentuh.
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      { resolve: { alias }, test: { name: "unit", include: ["tests/*.test.ts"], environment: "node" } },
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/db/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/pg-global.ts"],
          setupFiles: ["tests/support/db-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
