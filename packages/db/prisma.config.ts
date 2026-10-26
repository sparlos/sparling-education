import { defineConfig } from "prisma/config";
import { localDatabaseUrl } from "./src/url.ts";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? localDatabaseUrl },
});
