<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as `Status:` lines. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context: root `GLOSSARY-MAP.md` points to per-workspace `GLOSSARY.md` files under `apps/*` and `packages/*`. See `docs/agents/domain.md`.

### Checking front-end work

Before calling front-end work done, or before reaching for any browser: see `docs/agents/frontend-testing.md`. Rendered-app tests are the proof, and headless Chrome in the sandbox is for the look.

### Voice lines

Every spoken line, in a game or the play shell (`apps/play/src/ui/shell-strings.ts`), is recorded with `@repo/voice`; see `packages/voice/README.md`. `pnpm voice` runs only on the founder's Mac, so after adding or changing a spoken string, tell the founder to run it, then listen and commit. Until then the line falls back to browser speech, and `pnpm check-voice` fails.

### Testing against the database

The API's tests run against an ephemeral Postgres. See `docs/agents/testing.md` before adding API tests or schema changes.

## Running anything in the sandbox

Agents always run in a Linux (arm64) sandbox with the repo mounted from the founder's Mac. `node_modules` is the Mac's, so anything with a native binary (Vite, Vitest, Biome, rolldown, esbuild, lightningcss) fails here, e.g. `Cannot find native binding` or the tour dying with `kill ESRCH` when its dev server can't start.

- **Never run `pnpm install` in the repo itself:** it would swap the Mac's native binaries for Linux ones. Ask the founder to run it on the host when dependencies change.
- **Edit in the repo, run in a scratch copy.** Sync the source into the scratchpad without `node_modules`, install there once, and run tests, type checks, Biome, `pnpm tour` and `pnpm mutate` in the copy:

  ```bash
  rsync -a --delete --exclude node_modules --exclude .git --exclude .turbo --exclude dist --exclude .next --exclude .venv ./ <scratchpad>/repo/
  (cd <scratchpad>/repo && pnpm install --frozen-lockfile --store-dir <scratchpad>/store)
  ```

  Re-run the rsync after each edit; the excludes keep the copy's own `node_modules` from being deleted, and leave out the web app's build cache and the voice package's Python environment (about 1 GB together; the sandbox disk is small). If dependencies changed, install without `--frozen-lockfile` and copy back only `pnpm-lock.yaml`; never copy anything else back.

    Make sure that after you are done with the scratch copy you've created, clear it completely. eventually, it will bloat the sandbox (which has 20 GB of working room), and will not allow additional scratch copies to be made. If you run into a space problem with creating a scratch copy, make sure to check for existing, old scratch copies that can be deleted first - that's your best bet.
