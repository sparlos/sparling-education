// The Postgres test harness. See docs/agents/testing.md for how test suites use it.

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import pg from "pg";
import { createDb, type Db } from "./index.ts";

const templateDatabase = "kindling_template";

export interface TestPostgres {
  /** Connection URL of the migrated template database. */
  url: string;
  stop(): Promise<void>;
}

/**
 * Starts one ephemeral Postgres container and applies the migrations to a
 * template database. Call it once per test run, from the global setup.
 */
export async function startTestPostgres(): Promise<TestPostgres> {
  const container = await new PostgreSqlContainer("postgres:17-alpine")
    .withDatabase(templateDatabase)
    .start();
  const url = container.getConnectionUri();
  applyMigrations(url);
  return {
    url,
    stop: async () => {
      await container.stop();
    },
  };
}

function applyMigrations(url: string) {
  const prisma = createRequire(import.meta.url).resolve(
    "prisma/build/index.js",
  );
  execFileSync(process.execPath, [prisma, "migrate", "deploy"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
}

export interface TestDatabase {
  db: Db;
  /** Empties every table, so the next test starts from a migrated, empty database. */
  reset(): Promise<void>;
  drop(): Promise<void>;
}

/**
 * Creates a database of its own for one test file, copied from the migrated
 * template, so test files running in parallel never see each other's data.
 */
export async function createTestDatabase(
  templateUrl: string,
): Promise<TestDatabase> {
  const name = `test_${randomUUID().replaceAll("-", "")}`;
  await runAsAdmin(
    templateUrl,
    `CREATE DATABASE "${name}" TEMPLATE "${templateDatabase}"`,
  );
  const url = new URL(templateUrl);
  url.pathname = `/${name}`;
  const db = createDb(url.toString());

  return {
    db,
    async reset() {
      const tables = await db.$queryRaw<{ name: string }[]>`
        SELECT tablename AS name FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
      if (tables.length === 0) return;
      const list = tables.map((t) => `"${t.name}"`).join(", ");
      await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
    },
    async drop() {
      await db.$disconnect();
      await runAsAdmin(templateUrl, `DROP DATABASE "${name}" WITH (FORCE)`);
    },
  };
}

// CREATE and DROP DATABASE can't run while connected to the databases they
// touch, so they go through the server's maintenance database.
async function runAsAdmin(templateUrl: string, sql: string) {
  const url = new URL(templateUrl);
  url.pathname = "/postgres";
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}
