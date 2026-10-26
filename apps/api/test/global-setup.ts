import { startTestPostgres } from "@repo/db/testing";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const postgres = await startTestPostgres();
  project.provide("databaseUrl", postgres.url);
  return () => postgres.stop();
}
