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

### User-facing content

Everything a user reads or hears: screen text, walkthroughs, emails, and voice lines in games and the play shell.

- **No internal language.** Glossary terms are for the code and its docs. Words a user sees or hears must make sense to someone who has no idea how the platform works or how it identifies things, unless the UI explains the term somewhere they'll see it. Say "each time Ben played a game", not "Ben's plays".
- **Easy to read on the first pass.** Use natural, short sentences. Unpack noun-heavy phrases, and spell out how things connect.

### Voice lines

Every spoken line, in a game or the play shell (`apps/play/src/ui/shell-strings.ts`), follows User-facing content above and is recorded with `@repo/voice`; see `packages/voice/README.md`. `pnpm voice` runs only on the founder's Mac, so after adding or changing a spoken string, tell the founder to run it, then listen and commit. Until then the line falls back to browser speech, and `pnpm check-voice` fails.

### Testing against the database

The API's tests run against an ephemeral Postgres. See `docs/agents/testing.md` before adding API tests or schema changes.

## Running anything in the sandbox

Agents always run in a Linux (arm64) sandbox with the repo mounted from the founder's Mac. `node_modules` is the Mac's, so anything with a native binary (Vite, Vitest, Biome, rolldown, esbuild, lightningcss) fails here, e.g. `Cannot find native binding` or the tour dying with `kill ESRCH` when its dev server can't start.

- **Never run `pnpm install` in the repo itself:** it would swap the Mac's native binaries for Linux ones. Ask the founder to run it on the host when dependencies change.
- **Edit in the repo, run in a scratch copy.** Use `scripts/scratch.sh`. The copy lives at `~/scratch/edtech/repo`, outside the repo, and stays warm between sessions, so don't delete it when you finish. The script re-syncs source (never `node_modules`, `.git`, caches or the voice Python env) and only installs when `pnpm-lock.yaml` changed.

  ```bash
  scripts/scratch.sh                      # sync, print the copy's path
  scripts/scratch.sh pnpm --filter @repo/api test   # sync, then run a command in the copy
  ```

  Re-run it after each edit. Run tests, type checks, Biome, `pnpm tour` and `pnpm mutate` this way. If dependencies changed, install in the copy without `--frozen-lockfile` and copy back only `pnpm-lock.yaml`; never copy anything else back. If the sandbox disk is short on space, delete old throwaway files in `~/scratch/edtech` first, and use `scripts/scratch.sh --clean` as a last resort.

- **If the shell starts failing, stop and tell the founder.** When every Bash command fails with no output, or file edits are refused because a path's symlink resolution changed (often after the working directory shows as `(deleted)`), the founder ran a `pnpm` command on the Mac, which swapped the mounted directories out from under the sandbox. Don't retry or work around it. Tell the founder to restart the Docker sandbox, resume this session, and tell you to continue where you got cut off. Say exactly what you were in the middle of, so you can pick it up from there.
