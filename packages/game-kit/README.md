# @repo/game-kit

The starter kit every game is built with, extracted from Fraction Hop
(`games/fraction-hop`, the first game built on it). A game is still only the
contract (`@repo/game-contract`): the kit is the template, test harnesses and
checks around it.

## Start a game

```sh
pnpm new-game <slug>
```

Needs an approved `games/<slug>/SPEC.md` from `design-game` ("Status:
approved", "Slug: <slug>"). It copies `template/` beside the spec (the spec is
kept), renames it, and registers the game in `apps/play`: a dependency, and an
entry in `src/games.ts` that loads its voice-line map
(`virtual:voice-lines/<slug>`, from `@repo/voice/vite`). Then run `pnpm
install` on the host, and replace the template's example game with the spec's.

The template is a tiny working game (tap the bigger of two unit fractions)
that shows each pattern. It's type-checked and tested here, with its own
example `template/SPEC.md`, so it can't rot.

## What's in it

| Import | What |
| --- | --- |
| `@repo/game-kit/testing` | `mountGame(game, { tier, voice?, random? })`: the fake shell. Mounts a game through the contract, records lines said, sounds, music, attempts, progress and finishing, and checks every call against the manifest. `heldVoice()` finishes lines by hand, to test that voice and actions take turns. `wait(ms)` advances fake timers. |
| `@repo/game-kit/testing/setup` | The Vitest setup file: jest-dom, a `matchMedia` stub, cleanup, and **failing any test in which a mounted game broke the contract**. |
| `@repo/game-kit/spec` | `readSpec`, `describeManifestSpec` (header, tiers, misconceptions), `stringRows`, `subsections`, `codes`: tests that read SPEC.md and fail on drift. |
| `@repo/game-kit/art` | `Slot`, `SlotArt` (in an SVG) and `SlotImage` (standalone): art slots with a frame and anchor, replaceable by real art without code changes. |
| `@repo/game-kit/frame` | `GameFrame`: the screen every game is laid out in. It draws Hint (or Skip, in a tutorial) top-right, the main button bottom-right, the caption under the play area and the ghost hand, and the game fills `info`, `stage`, and `side` or `deck`. Also `NumberPad`, `offerHint` (the hand gliding to the glowing button while the voice offers a hint) and `handMs`. A kit test fails if a game draws any of these itself, and the tour fails if they aren't in their places. |
| `@repo/game-kit/frame-strings` | `frameStrings` and `hintAgainStrings`, spread into a game's strings: the shared controls' words, so no game words them its own way. Plain TypeScript, because the voice tool and the API load strings in Node. |
| `@repo/game-kit/burst` | `<Burst x y count spread duration>{particle}</Burst>`: a particle burst (sparkles, droplets) in HTML over the game, animated on `transform` and `opacity` with the Web Animations API, so it costs no layout or repaint. Fine for a few dozen particles at once; reach for a canvas only for hundreds, or effects that never stop. One fading particle with reduced motion. Unmount it after `duration`. |
| `@repo/game-kit/timers` | `useTimers()`: `later`, `pause`, `clear`, for pauses between turns. Never time a voice line: `await say(...)`. |
| `@repo/game-kit/random` | `seeded`, `int`, `pick`: reproducible plays. |
| `@repo/game-kit/tour` | `defineTour` for a game's `tour.ts`. |
| `@repo/game-kit/mutations` | `defineMutations` for a game's `mutations.ts`. |

## Sound effects and music

1. Put the files in `games/<slug>/audio/`. Use `.ogg` or `.mp3`, and keep effects short.
2. List their IDs in the manifest: `sounds: ["crystal-drop"]`.
3. Pass the files to `defineGame` in `src/index.tsx`. It won't compile if one's missing:

   ```ts
   import crystalDrop from "../audio/crystal-drop.ogg";

   export default defineGame(manifest, MyGame, { "crystal-drop": crystalDrop });
   ```

4. Call `playSound(id, { volume?, rate? })` at the moment the sound belongs to, and `playMusic(id)` or `playMusic(null)` for a looping track.

The shell owns the rest (`apps/play/src/play/sounds.ts`). It loads every file on the start tap and plays them through Web Audio, so an effect starts within milliseconds and many can overlap. It lowers music under the voice, and stops it when the play ends. An effect can sound during a voice line, unlike an on-screen action, because it never carries an instruction. A sound can't be the only sign of anything, since no grade requires sound.

In tests, `shell.sounds` and `shell.music` list what was played.

## Checks

```sh
pnpm --filter @games/<slug> test   # rules, spec and fake-shell tests
pnpm tour <slug>                   # headless Chrome through the real shell
pnpm mutate <slug>                 # break each key rule; the tests must notice
```

- **Run Vitest from the game's folder** (`--filter` does). From anywhere else
  its `vitest.config.ts` is missed and every test fails with no jsdom.
- **`pnpm tour <slug> [--grades 3,4] [--jobs 6] [--out dir] [--url base] [--chrome path]`**
  runs `games/<slug>/tour.ts` at each tier's grade, at 1366 × 650 and
  1280 × 650, up to `--jobs` runs at once (use `--jobs 1` if timing looks
  flaky): a stand-in student signs in, the shell's start button is tapped,
  and the game's `play` takes over. A tour's `reducedMotion` can shorten the
  animations at a size that only checks fit. `checkFit` fails on page scroll, elements
  that must show being cut off, and buttons under the minimum target (64 px
  for Grades 1–2, 48 px after, or the game's own). Console errors and a
  game that doesn't end back home fail too. It uses the dev server at
  `http://127.0.0.1:3003/play` or starts one. Chrome is Playwright's
  `chrome-headless-shell` from `~/.cache/ms-playwright` if there is one, else
  the installed Google Chrome. Speech is stubbed; recorded lines play.
- **`pnpm mutate <slug> [name ...]`** applies each mutation in
  `games/<slug>/mutations.ts` (code that occurs exactly once, and what it
  becomes), runs the tests, and restores the file. A miss is an untested rule:
  add a test, or mark it `survives` with why it can't matter (e.g. redundant
  code). A mutation whose code changed is reported stale.
- **The contract's type test** is `packages/game-contract/src/contract.typetest.tsx`,
  checked by `pnpm check-types`.

## Not here

- Voice-line generation: `packages/voice` (`pnpm voice`). The kit only
  registers a game's line map with the shell.
- Chromebook budgets beyond touch targets (bundle size, throttled frame rate):
  not automated yet.
