import { serve } from "@hono/node-server";
import { createDb, localDatabaseUrl } from "@repo/db";
import { createApp } from "./app.ts";

const port = Number(process.env.PORT ?? 3002);
const db = createDb(process.env.DATABASE_URL ?? localDatabaseUrl);

// Only `pnpm dev` passes --api-reference; the deployed API doesn't serve it.
const apiReference = process.argv.includes("--api-reference");

const app = createApp({ db, apiReference });

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
  if (apiReference) {
    console.log(`api reference at http://localhost:${info.port}/reference`);
  }
});
