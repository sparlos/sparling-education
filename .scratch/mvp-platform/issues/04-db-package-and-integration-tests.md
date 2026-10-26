# 04: Database package and Postgres integration tests

**What to build:** Kindling has a real database. `pnpm dev` brings up Postgres in Docker on a non-standard port with migrations applied, and the API's tests run against an ephemeral Postgres. One route goes through the whole path to prove it.

**Blocked by:** 03

**Status:** done

- [x] A new `packages/db` owns the Prisma schema, migrations and generated Prisma client. It's the only place schema changes are made
- [x] The `db` package's dev task starts a Postgres container on host port 55432 and applies migrations, and `pnpm dev` runs it before the API. Read the installed Turborepo docs before changing turbo config
- [x] The API reads its database URL from the environment, with a local default pointing at port 55432
- [x] Vitest's global setup starts one `@testcontainers/postgresql` container and applies the migrations, and tests isolate their data between runs
- [x] API tests send requests through `testClient` from `hono/testing`, and the app's route types stay inferable (routes chained)
- [x] A health-check route that reads from the database is covered by an integration test
- [x] The test harness is documented in one place, so later tickets add tests without re-deciding any of this

## Comments

**2026-10-26, agent:** Done in the working tree, uncommitted. `@repo/db` is on Prisma 7.10.1 (the `prisma-client` generator with the `pg` driver adapter) and starts with one empty `init` migration, so the first real table arrives with ticket 05. `@repo/db#dev` is a finite task (compose up, wait for healthy, `migrate deploy`) and `api#dev` depends on it, so the container keeps running after `pnpm dev` exits; `pnpm --filter @repo/db stop` stops it. `GET /health` now runs `SELECT 1` and returns 503 `{ status: "unavailable" }` when the database can't be reached. Test isolation: one container per run, a database per test file copied from a migrated template, every table truncated before each test (checked in the scratch copy with a throwaway table across two parallel files). The harness is documented in `docs/agents/testing.md`, linked from AGENTS.md. `pnpm-workspace.yaml` allows Prisma's install scripts. Type checks, all tests and `biome check .` pass in the scratch copy. The founder needs to run `pnpm install` on the host.

**2026-10-26, agent:** Added a Scalar API reference at `/reference` (`@scalar/hono-api-reference`), served only by `pnpm dev` (the dev script passes `--api-reference`); `pnpm start` returns 404 for it. The founder needs to run `pnpm install` on the host.
