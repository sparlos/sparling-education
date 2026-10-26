# 04: Database package and Postgres integration tests

**What to build:** Kindling has a real database. `pnpm dev` brings up Postgres in Docker on a non-standard port with migrations applied, and the API's tests run against an ephemeral Postgres. One route goes through the whole path to prove it.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] A new `packages/db` owns the Prisma schema, migrations and generated Prisma client. It's the only place schema changes are made
- [ ] The `db` package's dev task starts a Postgres container on host port 55432 and applies migrations, and `pnpm dev` runs it before the API. Read the installed Turborepo docs before changing turbo config
- [ ] The API reads its database URL from the environment, with a local default pointing at port 55432
- [ ] Vitest's global setup starts one `@testcontainers/postgresql` container and applies the migrations, and tests isolate their data between runs
- [ ] API tests send requests through `testClient` from `hono/testing`, and the app's route types stay inferable (routes chained)
- [ ] A health-check route that reads from the database is covered by an integration test
- [ ] The test harness is documented in one place, so later tickets add tests without re-deciding any of this
