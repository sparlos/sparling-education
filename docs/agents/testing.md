# Testing against the database

How the API's tests run against a real Postgres. Later tickets add tests the same way, without changing any of this.

## The database in development

- `packages/db` (`@repo/db`) owns the Prisma schema (`prisma/schema.prisma`), the migrations (`prisma/migrations/`) and the generated client. Schema changes are made there and nowhere else.
- To change the schema, edit `schema.prisma`, then run `pnpm --filter @repo/db migrate` with the dev database up. It writes a new migration; commit it.
- `pnpm dev` runs `@repo/db#dev` before the API: it starts Postgres in Docker (`packages/db/docker-compose.yml`, host port **55432**) and applies the migrations. The container keeps running after `pnpm dev` stops; `pnpm --filter @repo/db stop` stops it.
- The API reads `DATABASE_URL`, defaulting to the dev database (`localDatabaseUrl` in `@repo/db`).

## How a test run works

1. **Once per run**, Vitest's global setup (`apps/api/test/global-setup.ts`) calls `startTestPostgres()` from `@repo/db/testing`. It starts one ephemeral container with `@testcontainers/postgresql` and applies the migrations to a template database.
2. **Once per test file**, importing `apps/api/test/client.ts` copies the template into a database of the file's own, so test files running in parallel never share data.
3. **Before each test**, every table in that database is truncated. Each test starts from a migrated, empty database.

Docker must be running. The sandbox has a Docker daemon, so the tests run in the scratch copy (see AGENTS.md).

## Writing an API test

```ts
import { describe, expect, it } from "vitest";
import { client } from "../test/client.ts";

describe("health", () => {
  it("reports that the API and its database are up", async () => {
    const res = await client.health.$get();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

- Send requests through `client`, the `testClient` from `hono/testing`. It's typed from the app's routes, so routes must stay chained in `createApp` (`const app = base.openapi(...).openapi(...)`). A route registered as a separate statement disappears from `client`'s type.
- Set up state by calling the API, the way a user would. Seed through `db` (also exported from `test/client.ts`) only when no endpoint creates that state yet.
- Assert on responses, not on Prisma calls or table contents (see "Testing Decisions" in `.scratch/mvp-platform/spec.md`).
- For a dependency that isn't the database, pass it to `createApp` the way `db` is passed.
- Students sign in through Google's redirect-mode form, faked by `signInAsStudent()` from `test/client.ts` (or `postStudentSignIn` to control the double-submit cookie). It returns the headers that act as that browser.
- Google sign-in is faked by `google` from `test/client.ts`: `google.credentialFor({ sub, given_name, family_name })` hands out a credential the app accepts, as Google's button would. Sign in by posting it to `/sign-in`, then send `cookiesFrom(res)` as the `headers` of later requests to act as that browser.

## Other packages

The harness in `@repo/db/testing` doesn't depend on Vitest. A package whose tests need the API over a real database (e.g. the contract suites against real adapters) copies the global setup from `apps/api/test/`, makes its own per-file database the way `test/client.ts` does, and gets the app and fake Google from `api/testing`. `apps/teach/src/platform/api/api.test.ts` and `apps/play/src/platform/api/api.test.ts` show the shape, including a cookie-keeping `fetch` handed to the generated client with `setFetch`.
