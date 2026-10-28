import { writeFile } from "node:fs/promises";
import { createDb, localDatabaseUrl } from "@repo/db";
import { createApp, openApiConfig } from "../src/app.ts";
import { noIdentityVerifier } from "../src/identity.ts";

// The client never connects: generating the document doesn't touch the database.
const db = createDb(localDatabaseUrl);
const doc = createApp({
  db,
  identity: noIdentityVerifier,
}).getOpenAPI31Document(openApiConfig);
const out = new URL("../openapi.json", import.meta.url);
await writeFile(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${out.pathname}`);
