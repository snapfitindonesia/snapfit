import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tes unit logika murni (uang, stok, ongkir, voucher, koin, CSV) — tanpa database / jaringan.
// Jalankan: npm test
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
