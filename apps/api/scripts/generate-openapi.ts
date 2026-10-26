import { writeFile } from "node:fs/promises";
import { createApp, openApiConfig } from "../src/app.ts";

const doc = createApp().getOpenAPI31Document(openApiConfig);
const out = new URL("../openapi.json", import.meta.url);
await writeFile(out, `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${out.pathname}`);
