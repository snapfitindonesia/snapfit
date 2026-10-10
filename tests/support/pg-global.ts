// Skema SQL untuk Postgres sementara (PGlite) dibuat SEKALI dari prisma/schema.prisma lalu dibagikan ke
// setiap file tes kelompok "db" (tests/support/db-setup.ts membuat database baru per file).
import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    schemaSql: string;
  }
}

export default function setup(project: TestProject) {
  const sql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  project.provide("schemaSql", sql);
}
