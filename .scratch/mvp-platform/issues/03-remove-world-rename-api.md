# 03: Remove the world; rename to the core API

**What to build:** The repository no longer contains the class world. The prototype is one checkout away behind a tag, and the world's API becomes Kindling's core API, ready for real endpoints.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] A git tag `world-poc` points at the last commit that contains `apps/hubworld`, multiplayer presence and the 3D avatar export (ask the founder before pushing the tag)
- [x] `apps/hubworld` is deleted, along with `@repo/avatar`'s PlayCanvas export and its PlayCanvas peer dependency. The 2D portrait and avatar look are unchanged
- [x] `hubworld-api` is renamed `api` and `hubworld-api-client` is renamed `api-client`, and every reference to them is updated, including the turbo tasks, orval config and package names
- [x] Presence is removed: the world store, event bus, WebSocket route and player schemas, plus their tests. The API still serves a generated OpenAPI document, and the client still generates
- [x] The API's tests run on Vitest instead of `node --test`
- [x] The play shell's stand-in hub link no longer points at the hubworld dev server. It keeps working with a placeholder until ticket 09
- [ ] Type checks, Biome and all tests pass in the scratch copy. The founder is told that `pnpm install` must be run on the host

## Comments

**2026-10-26, agent:** Done in the working tree, uncommitted. `world-poc` is tagged locally at `ee1afb9`; not pushed, waiting on the founder. With presence gone the API had no routes, so it has one, `GET /health` (`getHealth`), to keep the OpenAPI document and the generated client non-empty. The stand-in hub link now goes to a placeholder screen in the shell, `/play/__stand-in/hub?portal=&play=`. Type checks and all tests pass in the scratch copy. Biome passes for every touched file; it still flags pre-existing issues elsewhere (two lab prototypes, `.agents`/`.claude` skill scripts, a `.scratch` tour script). The founder needs to run `pnpm install` on the host.
