import { serve } from "@hono/node-server";
import { createDb, localDatabaseUrl } from "@repo/db";
import { createApp } from "./app.ts";
import { googleIdentityVerifier, noIdentityVerifier } from "./identity.ts";

const port = Number(process.env.PORT ?? 3002);
const db = createDb(process.env.DATABASE_URL ?? localDatabaseUrl);

// Only `pnpm dev` passes --dev: it serves the API reference and lets the
// session cookie work over plain HTTP. The deployed API does neither.
const dev = process.argv.includes("--dev");

const clientId = process.env.GOOGLE_CLIENT_ID;
if (!clientId) {
  console.warn(
    "[api] GOOGLE_CLIENT_ID isn't set, so every sign-in is rejected. See apps/teach/README.md.",
  );
}
const identity = clientId
  ? googleIdentityVerifier({ clientId })
  : noIdentityVerifier;

const app = createApp({
  db,
  identity,
  secureCookies: !dev,
  apiReference: dev,
});

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`api listening on http://localhost:${info.port}`);
  if (dev)
    console.log(`api reference at http://localhost:${info.port}/reference`);
});
