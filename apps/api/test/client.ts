// Import this from an API test file to get a client for the app, backed by a
// database of the file's own that is emptied before each test.

import { createTestDatabase } from "@repo/db/testing";
import { testClient } from "hono/testing";
import { afterAll, beforeEach, inject } from "vitest";
import { type App, createApp } from "../src/app.ts";

const database = await createTestDatabase(inject("databaseUrl"));

beforeEach(() => database.reset());
afterAll(() => database.drop());

export const { db } = database;
export const app = createApp({ db });
export const client: ReturnType<typeof testClient<App>> = testClient(app);
