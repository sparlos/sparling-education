# Checking front-end work

How to show that a change to `apps/play`, `apps/teach` or a game works. Work down the ladder: each rung is for what the one above can't show. Run everything in the scratch copy (see AGENTS.md).

## 1. Rendered-app tests: the proof

Vitest and Testing Library render the whole app over its in-memory platform (the play shell's stand-ins, the teacher app's fake port) and assert what a user sees, hears and can do. Every acceptance criterion about behaviour is proven here. The examples to copy are `apps/play/src/ui/App.test.tsx` and `Locker.test.tsx`, and `apps/teach/src/ui/App.test.tsx`.

The contract suites (`src/platform/api/api.test.ts` in each app) tie the in-memory platform to the real API over a test Postgres, so those test runs need Docker.

## 2. Headless Chrome: the look

Use this for layout, fit, touch-target sizes and anything else jsdom can't measure. It's the only real browser in the sandbox. Playwright's `chrome-headless-shell` lives under `~/.cache/ms-playwright/chromium_headless_shell-*/`, and `playwright-core` is a dependency of `@repo/game-kit`.

1. Start the app's dev server in the scratch copy on its in-memory platform, at a port nothing else uses:
   - play shell: `VITE_PLAY_PLATFORM=stand-in pnpm exec vite --port 3013 --strictPort --host 127.0.0.1`
   - teacher app: `VITE_TEACH_PLATFORM=fake pnpm exec vite --port 3014 --strictPort --host 127.0.0.1`
2. Write a throwaway script under the scratch copy's `packages/game-kit/scripts/`, so `playwright-core` resolves. Launch with `executablePath` set to that `chrome-headless-shell`. Seed state the way the tour does: `page.addInitScript` writes the play shell's stand-in student to `localStorage` (`stand-in.student`).
3. Screenshot at 1366×768 (the reference Chromebook) and 360×640. Then **Read the PNGs** to look at them. Measure targets with `getBoundingClientRect`: 48 px minimum, 64 px for Grades 1–2.
4. Stop the server, and delete the script.

## 3. Games: `pnpm tour <slug>`

The tour plays every tier of a game at both sizes in headless Chrome, on the stand-ins, and checks fit and target sizes. See the `build-game` skill.

## What the sandbox can't reach

- **Claude in Chrome and the desktop app's browser** run on the founder's Mac. They can't see the sandbox's dev servers unless the founder publishes a port (`sbx ports <sandbox> --publish 3013:3013`), so use headless Chrome. Ask the founder only when their eyes are the check, e.g. sign-off on a look.
- **Real Google sign-in** needs Google's servers and the founder's OAuth client. Tests use fake Google (`api/testing`) and the in-memory platforms. The founder checks real sign-in by hand.
