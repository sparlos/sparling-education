# Build log

Raw material for the `build-game`, `review-game` and `add-curriculum` skills (build-order step 7). For each step: what was decided, where the founder had to step in, and what a skill or doc could have settled up front.

## Step 3: play shell (2026-10-23)

### Decisions

- **Backend first or shell first?** Shell first, against stand-ins. Results storage depends on the scoring rules, which are still open, and the fractions game is the bigger unknown. The platform backend (sign-in, classes and grades, storing attempts, the demo class) gets its own spec once Plank Bridge is playable.
- **Platform seam.** Four ports (`session`, `attempts`, `links.signIn`, `links.hub`) in `apps/play/src/platform/ports.ts`. Stand-ins sit in `platform/stand-ins/`, each with a `STAND-IN` header, and log a warning on start-up. Shared contract suites in `platform/contract.ts` run against the stand-ins now and the real adapters later. `src/main.tsx` is the only file that picks a platform. The backend's brief is `platform/README.md`.
- **Attempt records** carry a shell-made `id` as the idempotency key, and a `play` ID that groups one play into its result. The backend must check `student` against the session.
- **Outbox.** One storage key per play (`kindling.play.outbox.<student>.<play>`), so two tabs never overwrite each other. Attempts left on the device go out on the student's next play. Retries use backoff, attempts made while offline wait for it, and the shell flushes when the connection comes back and when the tab is hidden. Finishing waits up to 4 s for sends, then leaves anyway.
- **Tier choice.** The student's grade if a tier matches. Otherwise the closest tier, the lower one on a tie.
- **Exit.** A student in a class who came through a portal goes to `hub({ portal, play })`. Anyone else gets the shell's game-complete screen, with play again.
- **Game packages default-export `defineGame(...)`.** The registry (`src/games.ts`) lazy-loads each game by slug.
- **The shell's controls sit in the left-hand corners:** "leave" at top-left, "hear it again" at bottom-left. Games must keep both corners clear.
- **Students can leave a game at any time** (founder's call). Tapping "leave" asks first, aloud, with a play icon and the door icon as the answers, so a stray tap doesn't end a play and it works without reading. Leaving goes the same way finishing does (back to the portal, or the end screen), but the end screen says "See you next time!" instead of "Well done!". Attempts made before leaving are kept and sent. `Play.end(ending)` replaced `finish()`.
- **The backend is told how each play ended** (founder's call). The attempts port became `PlayRecordsPort`, which sends `PlayRecord`s: attempts, then one `end` record (`finished`, `left` or `crashed`), through the same outbox so they arrive in order and survive going offline. A crash is recorded separately from leaving, so scoring never counts a broken game against a student's effort. A play with no end record was abandoned. Attempts after a play ends are dropped.
- **UI is `@repo/ui` (Mantine), chosen by the founder over tokens and plain CSS,** so games can use `@repo/ui` without it counting against their 250 KB. This added `IconButton` (48/64 px), `Loader`, `onClick` on `Button`, and the `speaker` and `replay` icons.
- **Fonts are self-hosted** (`@fontsource-variable`). Google Fonts would send students' IPs to Google, which matters for board privacy review.
- **Tests use Vitest, React Testing Library and jsdom.** Mantine needs a `matchMedia` stub in jsdom (`src/test/setup.ts`).
- **Shell size (first build):** 86 KB gzipped JS, 38 KB gzipped CSS (all of Mantine's `styles.css`), and about 70 KB of latin fonts.

### Where the founder stepped in

1. Asked whether endpoints and a database should come before the shell. **Avoidable?** Partly. The spec's build order assumed it without saying why. Specs that put work on a seam before the other side exists should say so and give the reason.
2. Asked for stand-ins to be clearly separated, with an obvious contract to build the backend against. **Avoidable:** yes. Make it a standing rule: "every unbuilt dependency is a port with stand-ins and a contract suite".
3. Asked for React test tooling and production-ready quality. **Avoidable:** yes. The spec's testing decisions didn't name a tool, and "production ready" was implied but not written down.
4. Asked for every skill to end in a retro. Done: `docs/agents/skill-retro.md`, linked from `design-game`.
5. Decided students can leave mid-game. **Avoidable?** Partly. The spec covered finishing but never leaving. A shell spec should list every way a student can exit.
6. Chose `@repo/ui` over tokens and plain CSS. **Avoidable?** No, this was a judgement call. But `.claude/rules/ui.md` only came into context when files under `packages/ui` were opened. Read `.claude/rules/` before any UI work.

### Gotchas

- **`pnpm install` can't run in the shared sandbox `node_modules`.** It works in a scratch copy of the repo (rsync without `node_modules`, `pnpm install --store-dir <scratch>/store`). There you can run type checks, tests and builds, then copy back the source and `pnpm-lock.yaml`. The founder still runs `pnpm install` on the host.
- **`crypto.randomUUID` is missing outside secure contexts,** e.g. a Chromebook hitting a dev server over the LAN. Use `src/play/ids.ts`.
- **Tests passed on the first run, and breaking the code on purpose showed gaps:** one timing-flaky test, and one rule (backoff while offline) with no test. Breaking each key rule on purpose once caught both. This belongs in `build-game` and `review-game`.

### Left open

- The class world doesn't read `?portal=&play=` yet. Spawning at the portal and the reward reveal are class-world work.
- The avatar portrait is a stand-in until step 4. Voice recordings (`lineUrl`) come in step 6, and until then every line uses browser speech.
- The shell's own strings are English only.
- Mantine's full `styles.css` could be cut to the components in use if the shell's size becomes a problem.
- The game contract's type checks are still the throwaway example from step 1. Check in a type test when the starter kit is extracted.
- The Chromebook budget checks (throttled CPU, Fast 3G) come in step 6.

## Step 4: avatar portrait (2026-10-23)

### Decisions

- **Part slots over colour only** (founder's call). New package `@repo/avatar`. A look is `{ body, eyes, headwear }`: a body colour ID and an item ID per slot (`headwear` can be null). IDs are what gets stored, so the illustrator's art replaces placeholders without touching stored looks.
- **One package, three entry points.** `@repo/avatar` holds the data with no React or PlayCanvas, so the backend can validate looks with `parseLook`. `@repo/avatar/portrait` is the 2D React portrait. `@repo/avatar/playcanvas` is the 3D avatar, moved out of `apps/hubworld/src/avatar.ts`. React and PlayCanvas are optional peer dependencies.
- **2D and 3D parity is enforced by types.** Both renderers key their art as `Record<EyesId | HeadwearId, …>`, so adding an item to the catalogue fails type checks until it has both 2D and 3D art. Answers the founder's question "does every new asset need both?": only avatar items do. Furniture and the hub stay 3D only, and game art stays 2D only. A future body-clothing slot that doesn't show in the head-only portrait may need a "hidden in portrait" option.
- **The portrait's art frame is documented** in `portrait.tsx`: a 100×100 viewBox, the head circle at (50, 56) with r 38, eye anchors, and headwear above y 34 so the brows show in every expression. Each part carries `data-slot`/`data-item`.
- **`AvatarExpression` now lives in `@repo/avatar`.** `@repo/game-contract` re-exports it.
- **Looks come from a seed until they're stored.** `lookFromSeed(id)` gives stand-in students and other players in the hub distinct, stable looks. The local hub player uses `defaultLook`.
- **Body colours are tokens.** A test keeps ink at 3:1 or better against each one (WCAG 1.4.11).
- **Shell size:** 87 KB gzipped JS, up from 86 KB.

### Where the founder stepped in

1. Chose what the look data covers: part slots, colour only, or designing the avatar first. **Avoidable?** Partly. The spec said both "build from the same avatar data" and "the look is still to be designed" without saying how provisional the data could be. Specs should say when a step has to invent a provisional model, and how far it should go.
2. Asked whether every new asset needs 2D and 3D art. **Avoidable:** yes. The spec's "each new cosmetic item" was clear, but it didn't say that hub and game art are exempt.

### Gotchas

- **`git rm` fails on untracked files** (`apps/play` isn't committed yet). Use `rm`.
- **Hubworld's tsconfig needed `allowImportingTsExtensions`** to type-check workspace packages that import with `.ts` extensions.
- **The first render of every look × expression caught two overlaps** (the beanie band and the cap brim covered the brows) that no test would catch. Rendering a gallery to PNG (esbuild + `renderToStaticMarkup` + Playwright's headless shell) should be part of the starter kit's art checks.
- **Old stand-in sessions** stored `{ color }` looks. `parseLook` rejects those, so such a student is signed out and picks again. There's a test for it.

### Left open

- The 3D avatar's new parts (eyes, cap, beanie, crown) are type-checked and built, but **nobody has looked at them in the hub yet**.
- There's no avatar customisation UI yet (MVP: "Hub with portals, avatar customisation"). Looks aren't stored, and the hub doesn't sync looks between players; each player's look comes from their ID.
- No avatar character API, because Plank Bridge only uses the portrait.

## Step 5: Plank Bridge (in progress, started 2026-10-24)

### Part 1: the rules (`games/plank-bridge/src/rules/`)

Plain TypeScript with no React: `fraction.ts` (exact lengths), `random.ts` (seeded, so a bridge can be regenerated), `tasks.ts` (task types, which expectation each evidences, and each misconception's prediction), `generate.ts` (one bridge per tier), `judge.ts` (success, misconception, feedback) and `help.ts` (the help ladder). 60 Vitest tests.

### Decisions

- **Misconceptions are matched by length, not by the pieces used.** Asked for 3/4, any load totalling 4/3 counts as `numerator-denominator-swapped`, whether it's 4 thirds or a whole and a third. This is what the cart measures, and it keeps detection to one rule.
- **A ramp misconception is an ordering feature.** Each one is a key (top number, bottom number, value with the whole dropped), and a ramp order matches it when the order is sorted by that key, with ties in any order. The generator tries every ordering (at most 24): each misconception must own at least one ordering, no ordering may match two misconceptions or the right answer, and the steps may not arrive already in order.
- **If an attempt matches two misconceptions, none is recorded.** Guessing would put wrong evidence in front of a teacher. The generator makes this impossible, and a test covers it anyway.
- **Every prediction must be something the student can actually make with the chips on offer.** So combine patches use denominators up to sixths, where the summed denominator (up to twelfths) is a chip. 3/8 + 2/8 as 5/16 can't be cut, so it would never be revealed.
- **Orders are in lowest terms and never a whole number of planks.** The whole plank on the bench would answer those without any fractions. Fair shares are the exception: 4 planks for 2 gaps is allowed (the spec says shares can be whole).
- **Every task in a bridge is different, and a plain fraction order always comes first.** The rest are shuffled, and the first task of each type gets the demonstration.

### Spec gaps found

1. **The spoken "how far off" amount can fall outside the voice-line families.** 3/8 laid as 8/3 is over by 55/24, and families only go up to twelfths. The spec's own example is off too: 3/4 laid as 4/3 is over by 7/12, not "one third". **Founder's call:** Pip says the amount when there's a string for it, and otherwise just "Too short." or "Too long." (`result.short.plain`, `result.long.plain`), and the outline shows how far off it was. The spec has been updated.
2. **"12/5 against 2⅖" are equal,** so they can't both be steps on a rising ramp. Built as an improper fraction against a nearby mixed number instead.
3. **`numerator-denominator-swapped` is only revealable when the top number is a split chip,** so unit fractions (n = 1) and "eleven fourths" never reveal it. Not forced: forcing it would drop unit fractions.
4. **"Fill the rest" patches can't reveal any misconception,** because `adds-denominators` only predicts for combining. They're plain practice that evidences `g5.B2.5`.

### Where the founder stepped in

1. Decided what Pip says when a miss has no amount string. **Avoidable?** Partly. `design-game` should check that every amount the game speaks, differences included, falls within its string families.

### Gotchas

- **Breaking each key rule on purpose found 4 untested rules out of 10:** a dead branch in fair-share feedback (removed), the 1-plank share guard (it silently stopped 1-plank shares being generated), the "two matches records none" rule and the "makeable" check. Each now has a test. This confirms the step 3 lesson: mutation checks belong in `build-game`.

### Part 2: manifest and strings (`src/manifest.ts`, `src/strings.ts`)

### Decisions

- **The manifest's tiers and misconceptions are built from the rules** (`evidence`, `misconceptions` in `rules/tasks.ts`), so the expectations a game records and the ones it declares can't drift apart.
- **The string families are typed with template literals** (`frac.${number}-${number}` and so on). `t("frac.3-4")` type-checks, and `t("hint.nope")` doesn't. The catch: the pattern also accepts `frac.99-1`, so a test checks that every amount a generated bridge can speak has a string. This settles the spec's first open question.
- **Spreading records with template-literal keys drops those keys from the type.** So `strings` has its type written out. Without it, every family ID fails to type-check.
- **Tests read `SPEC.md`** and compare it with the manifest: slug, version, each tier's expectations, each misconception's expectations, and every fixed string word for word. Changing the spec without the code (or the reverse) fails the tests.
- **Added `planks.1`–`planks.3`** ("one plank" and so on) for misses off by whole planks, such as leaving out the whole of 1¾. The spec has been updated.
- **397 strings**: 39 fixed, 198 fractions, 112 mixed numbers, 35 shares, 10 rulers, 3 whole planks.
- **A swapped fraction usually gets the plain "Too long."** 6/5 laid as 5/6 is off by 11/30, which has no string. Every other misconception's miss has a spoken amount, and a test checks that.

### For part 3

- **The shell's `say()` can't speak a sequence.** Each call stops the line before it, and "hear it again" replays only the last line. Orders are two or three lines ("This gap needs" + "three fourths" + "of a plank."), so the contract needs `say(...ids)`, spoken in a row and replayed together.

### Gotchas

- **The session's working directory was deleted twice** (the folder was replaced on the host while the session ran), and Bash then failed on every command until a restart. File reads and edits kept working.
- **Breaking rules on purpose:** a wrong plural for n = 2 ("two half") passed until `frac.2-3` got its own test.

### Part 3: the game screen (`src/game/`), playable at `/play/plank-bridge`

### Decisions

- **The contract's `say` takes several lines: `say(...ids)`** (founder's call). They're spoken in a row as one instruction, and "hear it again" replays all of them. With browser speech they're joined into one utterance, which sounds more natural. With recordings they play one after another, and if a recording fails, the rest falls back to browser speech. This changed `@repo/game-contract`, `apps/play/src/play/voice.ts` and the shell's App, with 4 new voice tests.
- **The screen holds no game rules.** `flow.ts` (order, misses, help, what each commit records and says) and `bench.ts` (splitting, cutting, loading) are plain state with their own tests. The components render them.
- **Tap to pick up, tap to place, or drag.** A tap picks up a plank, piece or ramp step, and a tap on the cart or a slot places it. Dragging does the same with Pointer Events (`drag.ts`). Taps make every action testable in jsdom and usable without fine motor control. Drags were checked in headless Chrome.
- **Cut marks are tabs above the plank, not lines on it.** The first version put mark buttons on the plank, and on a short piece (two fifths) they covered it, so it couldn't be picked up. Only the browser tour caught this.
- **While a piece is picked up, the whole bay takes the tap**, including over pieces already loaded. Before this, a tap on a full cart unloaded a piece instead of placing one. Also found only in the browser.
- **The result scene covers the work area only,** so Pip's caption ("Too long. It's over by: one twelfth.") stays visible while the gap shows the miss.
- **Captions add a full stop after an amount** when a new sentence follows ("…one twelfth. Let's try again."). Speech still joins the raw strings.
- **Demonstrations by task type.** Length orders use the ghost hand on a spare plank: a different example to open the first order of a type, and after the third miss the right split without the cut. The first ramp shows two wrapped examples placed shortest first, then unwrapped. After a third ramp miss, the hand points at the first misplaced step and its slot (the spec's demonstration is about split chips, so this is my reading). After a fourth miss, that step is moved into its slot.
- **A ramp keeps its order after a miss**, so the student fixes it rather than starting again. Length orders send the load back to the bench, as the spec says.
- **Screen-reader labels use the amount strings:** a chip is "fourths", a mark or piece is "three fourths", a whole plank is "one plank". Five `label.*` strings cover the rest (bench, cart, gap, step, saw). The spec has been updated.
- **Art slots** (`art.tsx`): placeholder SVG for Pip's poses, the ghost hand, the cart with its portrait-window anchor, and icons, each in a fixed frame. Planks, pieces and gaps are CSS from `theme.ts` colours (all from `@repo/tokens`), stretched to length.
- **Plank length** is the window width over the most planks an order can need (2 at G3, 3 at G4 and G5), clamped to 160–520 px.
- **Size:** the game's chunk is 13 KB gzipped JS and 3 KB CSS, against a 250 KB budget.

### Where the founder stepped in

1. Approved changing the contract's `say` to take a sequence. **Avoidable?** Yes. The spec chose "no interpolation, the amount is its own string" without checking the contract could speak two strings in a row. `design-game` should check every string decision against the contract.

### Gotchas

- **All 13 play-through tests passed on the first run, again.** Breaking 14 rules on purpose found 4 gaps (a non-demo order never spoken, the amount never spoken, no caption, re-splitting cut pieces) and one redundant rule (help ranking, since the ladder only climbs). All fixed.
- **Two real usability bugs were invisible to the jsdom tests**: marks covering short pieces, and taps on a full cart unloading. A scripted headless-Chrome tour through each task type caught both. **The starter kit needs a browser tour**, not just jsdom: Playwright's `chrome-headless-shell` is already on the sandbox at `~/.cache/ms-playwright/`, and `playwright-core` installs into a scratch folder.
- **Rules tests run in plain Node** (`// @vitest-environment node`) because `new URL(…, import.meta.url)` isn't a file URL under jsdom. The shared setup file guards its `window` stub.
- **Biome's `biome-ignore` comments must sit right before the flagged statement**, and the formatter can move them. The `!important` blanket for reduced motion was replaced with explicit `animation: none` rules, matching `@repo/ui`.

### Left open

- **Touch targets below 48 px at G5:** a twelfths cut tab on a 365 px plank is about 26 px wide. The saw drag is the alternative there. Recalibrate when the budgets are checked on a real Chromebook.
- **Animation is minimal:** the cart rolls across on a fit and wobbles on a short load, and a long load tilts. The cart doesn't climb or roll back on ramps, and there's no drive to the bridge before the drop.
- **Timing is fixed, not tied to speech:** the contract's `say` has no "finished" signal, so the opening demonstration and results use fixed durations (4.5 s and 2.8 s).
- **The Chromebook budgets aren't measured yet** (throttled CPU, Fast 3G, drag frame rate). Step 6.
- **Art is placeholder** throughout, and Pip's poses are simple.

### Founder's verdict after playing (2026-10-24)

**"Not fun, bad concept."** The founder rejected Plank Bridge as a concept, not only as a build. The spec was approved through `design-game`, then built for 3 parts, with tests proving it teaches. Nobody checked whether it was fun until it was playable.

**Lesson for `design-game`:** pedagogy was approved on paper, but fun can't be. Before a game spec is approved, play throwaway prototypes of 2–3 candidate mechanics (minutes each, no rules engine, no art) and let the founder pick the one that's fun. A spec should record why the mechanic is fun, not only why it teaches.

**What carries over:** the contract change (`say(...ids)`), the patterns (rules as plain TypeScript with misconception predictions that are guaranteed distinct, tests that read the spec, breaking rules on purpose, a headless-Chrome tour), and the friction recorded above. The Plank Bridge code itself probably doesn't.

**Deleted (2026-10-24).** At the founder's request, `games/plank-bridge` (code and spec) was deleted and unregistered from `apps/play`. The patterns above survive only as descriptions here and in `spec.md`.

## Step 6: prototype lab (2026-10-24)

### Decisions

- **Routing:** `isLabUrl` in `play/routes.ts` matches `/play/lab` and `/play/lab/<slug>`. `main.tsx` lazy-loads `lab/index.tsx` only when `import.meta.env.DEV`, so production builds drop it. Checked: no lab code in `dist`, and the shell is still 87 KB gzipped JS.
- **A prototype is a folder.** `lab/<slug>/index.tsx` exports `meta` and a default component. `lab/registry.ts` finds them with `import.meta.glob`, so there's no registry to edit. The list and the grounding test both read it.
- **What the lab passes:** `grade` (1–8, picked on the list and remembered in localStorage, Grade 3 by default), `Avatar` (the portrait in `defaultLook`) and `speak(text)`. `speak` goes through the shell's `createVoice` with an identity text lookup, so "hear it again" works the same way as in games. It's a stable callback, so a prototype can speak from an effect.
- **The grounding test** (`lab/grounding.test.ts`, node environment) reads `packages/curriculum/reference/<edition>.json` by path (the package's exports exclude the reference layer) and fails on an unknown code, an edition that isn't imported (telling the agent to ask a human), no misconceptions, a misconception with no visible failure, or a sample task citing an expectation the prototype doesn't target. Breaking it on purpose (a fake code, an unimported edition) failed as expected.
- **A model prototype, `clothesline`** (G1–2 ordering whole numbers on a number line, from the G2 B1.2 clothesline sample task), so the lab is playable now and `design-game` has an example of how rough to be. It's deliberately not fractions, so it doesn't anchor the fractions session.

### Gotchas

- **`apps/play/src/test/setup.ts` assumed `window`,** so node-environment tests crashed. It's guarded now.
- **Each `speak` call cuts off the one before** (the voice stops the current line). The first clothesline build said the feedback, then immediately the next question over it. Say feedback and the next prompt as one line. Only the browser tour (spying on `speechSynthesis.speak`) showed this.
- Biome rejects `role="group"`; use a `fieldset`.

### Left open

- The lab doesn't pick a look or a locale. Add them if a prototype needs them.

## Step 7: design-game for the fractions game (2026-10-24)

### Prototypes played

- **Picked: Hop Code** (`lab/hop-code`). The founder's words: the fun is "plan a route, press the button, and see what happens". The plan → run → reveal loop is the hook.
- **Archived: Spring Run** (`lab/spring-run`, `isArchived: true`), kept playable in the lab's Archive tab at the founder's request. Why it lost: less to explore (fixed cards on fixed springs), and each spring starting from a different point on the number line was "kind of weird". It wasn't obvious what the fractions were doing. **Lesson:** keep each fraction's effect visible as a distance from where you are, building from 0.

### Open for grilling: what counts as an attempt

A failed run is not a failed attempt. Playing Hop Code, the founder built routes one hop at a time, pressing play after each to see where it landed, until they reached the flag. That's exploring, and it **must not count as failure**. The spec has to define what one attempt is (the task, a committed plan, or something else) and when a run is evidence of a misconception rather than a probe.

### Decided while grilling

- **Runs are probes, misses or solves.** Stopping short on grass is a probe and never counts. A splash (before or past the flag) or an overshoot on grass is a miss. A splash before the flag counts only when the hop that fell was the one just added, not a known mistake run again. Landing on the flag solves the task. Each task emits **one attempt**: solved or not, the most help used, and at most one misconception matched from its misses. Misses alone never make a task a failure.
- **The teacher sees distilled results, never runs.** Critical for this game: the founder wants assessable data without reading every press of play.
- **Ticks split each whole by the largest denominator on offer, at every grade.** The prototype had G5 ticks at halves only. That was a prototype choice, not the curriculum's (G5 B1.3 says "using appropriate tools"), and it's now fixed in `lab/hop-code`. G5 still needs equivalence: a flag at ⅔ with twelfths ticks means counting to eight twelfths.
- **The hint shows the fraction values on the ticks.**
- **Help ladder (no demonstration rung):** hint 1 shows the fraction values on the ticks. Hint 2: adding a hop block previews the distance it will hop, from where the plan currently ends. Guided is "here's how it works" on the student's own level. Both hint levels record as `hint` (no contract change). The level is logged locally for tuning and never reaches results.
- **First-time tutorial:** a scripted, in-code "video" with voice-over through the shell's voice, played before the first task and when new block types appear. Never recorded as help.
- **Polish, later:** highlight the plan's blocks along the bottom as each hop runs.
- **Guided walks through the student's own level:** the voice counts along the ticks to the flag, then the game places the first hop of a correct route and the student adds the rest, with one more hop placed after each further miss. The student always presses play and finishes it.
- **When help comes:** one hint button, always available. It glows after 2 misses on a task, and goes up to hint 2 after 2 more misses with hint 1 on. Guided starts by itself after 2 more misses with hint 2 on ("Let's do it together"). Probes and restarts never count. Help stays on for the rest of the task, and resets at the next one.
- **Three misconceptions, each with a pattern in play:**
  - `bigger-denominator-bigger`: a splash on a hop just added with a larger denominator, where a block with a smaller denominator would have landed on a stone (medium reliability).
  - `numerator-not-a-count`: a miss using as many hops as the flag's numerator, all of one unit fraction with a different denominator from the flag's (high).
  - `no-equivalence` (G4–5): hitting the hop budget using only the smallest block. This plan event counts as a miss, so it climbs the help ladder too.
  - `stops-at-one` is dropped: stopping at 1 on grass is a probe, so it can't be spotted. Solving a flag past 1 still evidences G4 B1.6.
- **Which misconception an attempt names:** `numerator-not-a-count` and `no-equivalence` count after 1 match in the task, `bigger-denominator-bigger` after 2. If several qualify, the most matches wins, and on a tie the first seen. It's recorded even when the task is then solved. These thresholds are starting numbers, to tune with real play.
- **Tiers evidence one expectation each:** G3 `g3.B2.8` (every route is unit-fraction hops added up), G4 `g4.B1.6` (flags past 1, counted along the ticks), G5 `g5.B1.3` (the flag shown in simplest form, the blocks in other units). Dropped from the prototype's claims: `g4.B2.7` (nothing shows multiplication) and `g5.B2.5` (G5 routes mix denominators). **Idea parked:** a repeat block ("3 × ¼ hop", like Lightbot's loops) would evidence `g4.B2.7`. Prototype it after this game, maybe for the second MVP game.
- **Misconceptions per tier:** `bigger-denominator-bigger` and `numerator-not-a-count` at all three tiers; `no-equivalence` at G5 only. **G4's budget is loosened** to the flag's numerator plus one spare, so counting in one unit always fits. Trading small hops for big ones is G5's challenge. It follows that G4's flag is shown in a unit that's on offer (e.g. ⁶⁄₄, not ³⁄₂), or reaching it would need equivalence. The prototype simplifies G4 flags, and the spec must not.
- **One play:** 6 tasks, the first 2 with one block type plus the whole hop, then the tier's full block set. No skip, since guided always reaches the flag. Leaving mid-task sends no attempt for that task (the shell records the play as left). The tutorial plays at the start of every play and can be skipped, until the contract can remember per student which block types they've seen (possibly added when the game is built).
- **No combos or scores.** A no-miss combo would reward understanding, but rewards follow effort (DESIGN.md principle 4, and "Rewards and recognition"). Instead, for polish: a "Nice fix!" cheer when changing only the hop that missed makes the next run land, and a rerun of an identical plan is refused ("That's the same plan. Change a hop first."). Spammers climb to guided, and their attempts say so.
- **Avatar: `character`, with the portrait as the hopper** (squash and stretch). Its expression follows play: thinking while planning, happy on a landing, encouraging after a splash, cheering at the flag. Drawn through an art slot so a full-body 2D character can replace it later. The contract's character API starts minimal: the portrait at any size, plus the expression.
- **Open, separate task:** the portrait's expressions look "weird/ugly" (founder). Fix them in `@repo/avatar`'s portrait, which every game shares, not in this game.
- **Touch, reading, sound:** tap a block to add it, tap a planned block to remove it, with no drag needed. Every target is at least 64 px, and ticks are never tapped. The only text a student needs is fraction notation, and every fraction is spoken too. Every result shows on screen (the splash at the missing stone, the landing fraction next to the goal's). Blocks are all the same size, so only the fraction says how far a block goes.
- **"Goal", not "flag"**, in everything a student sees or hears (founder: "flag" is ambiguous). The prototype's text is updated.
- **The game always fits the screen, with no scrolling or zooming.** On the founder's laptop the prototype needed zooming out or fullscreen, and "Goal at …" got cut off. This is a requirement, checked by the browser tour at Chromebook sizes, with the tighter UI as polish.
- **Renderer:** React and SVG, as in the prototype.
- **Teacher card approved as drafted.** Use it after introducing unit fractions on a number line (G3), counting past one (G4) or equivalent fractions (G5): it reinforces, it doesn't introduce. Each misconception has a plain-language reading and a reteach idea in Kindling's own words (paper strips, naming the unit aloud, trading strips on a fraction wall).
- **No coins.** The goal is the reward. Coins add nothing to what the game teaches, and they'd read as a score.
- **Visual polish is a second pass** after the core game plays well. Whether it becomes its own skill is decided after the build (noted in `spec.md` step 10).
- **Name: Fraction Hop** (`fraction-hop`), chosen by the founder over "Hop Code" as clearer. The prototype stays at `lab/hop-code` until it's archived.

### Approved, and the retro (2026-10-24)

The founder approved `games/fraction-hop/SPEC.md`. Retro edits accepted and applied: `design-game` step 3 (claim only expectations each task evidences; the browser check covers fitting 1366 × 650), step 4 (separate exploring from mistakes; `assisted` values are options, not a ladder), and the lab README (no points or coins, the same representation at every grade, fit the screen). Judgement calls left out of the skill: "goal" over "flag", no combos, the archive tab.

## Step 8: Fraction Hop (built to playable, 2026-10-24)

`games/fraction-hop` (`@games/fraction-hop`), registered in `apps/play/src/games.ts` with its voice line map, and playable at `/play/fraction-hop`. Not yet played by the founder.

### What's where

- `src/rules/`: plain TypeScript, no React. `course.ts` (positions in ticks, `runPlan`, `shortestRoute`), `generate.ts` (six courses per play, per tier), `judge.ts` (probe, rerun, miss or solve, and the three misconception patterns), `task.ts` (one task: plan, runs, the help ladder, the attempt), `random.ts` (seeded).
- `src/strings.ts` and `src/manifest.ts`: 191 strings (32 fixed, 9 hops, 150 amounts). Both are plain `.ts` with `.ts` imports, because `@repo/voice` loads the manifest with Node.
- `src/game/`: `FractionHop.tsx` (wires the rules to taps, timers, voice and the shell), `Board.tsx` (the screen), `Course.tsx` (the SVG course and hopper), `art.tsx` (the art slots), `tutorial.ts` (its course and script).
- Tests: `rules/rules.test.ts` (runs, verdicts, every misconception, the ladder, and generator invariants over 150 plays per tier), `spec.test.ts` (reads SPEC.md), `game.test.tsx` (fake shell, all three tiers played through). 67 tests.

### Decisions

- **Positions are whole ticks** (one tick = 1/unit of a whole, the unit being the largest denominator on offer), so every distance is exact and a plan is just a list of denominators (`[8, 8, 4]`).
- **A run continues past a goal landed on mid-plan.** Only the last hop on the goal solves ("the last hop lands exactly on the goal"), so ⅛ × 4 for ³⁄₈ is past the goal.
- **The course draws half a whole of water past its end**, so an overshoot by a whole hop from just before the goal splashes where it really lands. The number line still ends at the course's end, and a splash speaks no amount, so every spoken amount stays within 3 wholes.
- **The voice says one instruction per moment.** Each run's result is one `say(...)`, with `hint.ready`, `guided.*` and the guided count appended, because a new `say` cuts off the last (step 6's lesson).
- **Captions show amounts as stacked notation** and add a full stop after an amount when a sentence follows, as Plank Bridge did.
- **The run is timed with `setTimeout`, drawn with CSS**: the hopper's x moves linearly while an inner group arcs (keyframes), so it traces a parabola with height proportional to the hop's length, and it squashes on takeoff. Timers make the jsdom tests deterministic under fake timers. Reduced motion turns off the arc, squash and glow.
- **Layout is a grid whose course row takes what's left**, with the SVG at `meet`. At 1366 × 650 the course is about 1246 × 349 px, and 1246 × 279 px when a Grade 4 plan wraps to two rows of slots (budgets reach 26 in tenths).
- **No contract change was needed.** The character API "starts minimal: the portrait at any size, with an expression", which is the existing `Avatar` prop; the hopper slot draws it in a `foreignObject`.
- **Size:** 9 KB gzipped JS for the game's chunk, against a 250 KB budget. Shell unchanged at 87 KB. Voice lines are separate fingerprinted files, fetched only when said, so they don't count toward the 2 MB start budget.

### Readings of the spec the founder should confirm

Each is a judgement call made while building; none changes what's evidenced.

1. **Grade 3–4 tasks 3–6 only use units that have a distractor** (fourths, sixths, eighths, tenths). The spec says "a bigger distractor where one exists". Halves, thirds and fifths have none, so `bigger-denominator-bigger` could never show on those tasks. They still appear in tasks 1–2.
2. **Grade 5 tasks 1–2** tick in the goal's unit (the largest denominator on offer, per the Mechanic rule) and put the goal past one whole. Otherwise "not crossable with the smallest block alone" can't hold with only the goal's unit and the whole hop.
3. **Every course needs at least 2 hops.** A single-hop course (2/4 with a ½ block) has nothing to plan.
4. **Each hint tap goes up a level**, whether or not the button is glowing. The glow is a nudge; the button is "always available".
5. **Guided turns the tick labels on** while it counts along the ticks, and its placed hops are locked (drawn with a double border, not removable).
6. **Once passed, the goal stays marked** for the rest of the task.
7. **A run's result stays in place** (the splash, or the landing fraction) until the next run. Editing the plan sends the hopper home.
8. **Routes can be long at Grade 3–4.** For example, 19/10 with only tenths and a whole needs 10 hops. That's within the spec (goals up to 2 wholes, all tenths), but worth a look when playing.

### Not built (polish, per the spec, after the founder plays)

"Nice fix!" and the sparkle (the `sparkle` art and `run.nice-fix` string exist), refusing an identical rerun (`run.same-plan` exists), highlighting each plan block as its hop runs, and dragging blocks. Remembering per student whether the tutorial was seen isn't in the contract yet, so the tutorial plays every play.

### Voice

- **Found and fixed a bug in `@repo/voice/vite`.** For a game with no lines yet, `addWatchFile` on the missing `voice.lock.json` made Vite fail to resolve it as an import, so the game wouldn't load in dev. The plugin now only watches a lockfile that exists. After the first `pnpm voice`, restart the dev server so it picks the lockfile up.
- **The lines aren't generated yet:** `pnpm voice` needs the founder's Mac. Until then `check-voice` (in `pnpm test`) fails with 191 new lines, and the game uses browser speech.
- Strings follow the voice spec: whole sentences, and fragments only for the amount family. The longest instruction is guided's count (up to 30 amounts at Grade 5, "one twelfth … thirty twelfths").

### Gotchas

- **The working directory vanished again** (the repo folder was replaced on the host mid-session), and every Bash command failed until a restart.
- **`userEvent` hangs under Vitest's fake timers.** Testing Library's async wrapper waits on a `setTimeout(0)`, which only gets advanced for Jest's fake timers, so every `user.click` stalls. The game tests tap with `fireEvent.click` inside `act` instead.
- **Run Vitest from the package root.** Run from `src/`, it misses `vitest.config.ts` and fails with no jsdom. The first mutation run did this, so every mutation looked "caught".
- **Breaking 20 rules on purpose found 2 gaps:** `numerator-not-a-count` matching a splashing plan in the goal's own unit, and Grade 5 landings spoken in the goal's unit instead of the ticks'. Both are tested now. One survivor is a redundant timer clear.
- **The browser tour** (`playwright-core` with the sandbox's `chrome-headless-shell`, in a scratch folder) played every tier at 1366 × 650 and 1280 × 650. It checks for page scroll, a cut-off goal caption and targets under 64 px, plays a miss then a solve on every task, and checks the end screen. It found the voice-plugin bug and an overlap between the goal's fraction and its marker. The script is saved at `.scratch/game-framework/fraction-hop-tour.mjs`, to move into the starter kit (step 9).

### Where the founder stepped in

None during the build. The readings above are the questions to settle by playing.

### Founder's first play (2026-10-24)

1. **The tutorial's voice and hand ran in parallel**, so taps happened mid-sentence. Fixed timings guessed from line length can't line up with real audio. **Founder's call:** voice and actions take turns: say a line (the hand may hover on its target), then act, then the next line. **Fix:** the contract's `say` now returns a promise that settles when the instruction has been said, cut off or can't play (`apps/play/src/play/voice.ts`: recordings end, browser speech's `end` event, or a timeout of 2 s + 120 ms per character because some browsers never fire `end`). The tutorial is now an awaited cue list (`game/tutorial.ts`), and each line holds at least 1.5 s with no sound. Moving between tasks waits for "You found the goal!" too. **Avoidable?** Yes: the step-5 log already said "timing is fixed, not tied to speech", and nobody fixed it. Now in `spec.md` step 10 as a rule for `build-game`.
2. **No sound until the first tap.** Browsers block audio and speech before a user gesture. **Founder's call:** every game starts with a start button, in the shell. **Fix:** `PlayScreen` shows a start screen (the portrait and a play button, the `start` shell string) and mounts the game only after the tap. Howler wasn't added: after the start tap the page has sticky user activation, so plain `Audio` and speech play on every Chromebook. Its other benefit, queueing a blocked sound until the next tap, has nothing left to catch. Revisit if iOS Safari matters (it unlocks per element).
3. **The goal was marked after any overshoot.** **Founder's call:** mark it only on purpose. It's now marked by hint 1 (`hint.labels` now says so) or guided, or when it's found. The caption still says where the goal is after an overshoot.
4. **The hand ran off the bottom** on the plan and play buttons. It now points down from above on the lower half of the screen, turned about its fingertip.
5. **Play looked disabled while the hand tapped it.** In the tutorial the controls stay disabled but keep their normal look, and the hand presses in when it taps.
6. **"Stones" reads wrong:** they're land. `tutorial.goal-found` is now "No hop landed in the water, and the last one landed on the goal. Now you try!"

SPEC.md is updated for 1, 2, 3 and 6.

### Founder's second round (2026-10-24)

- **The hint glow was too subtle, and clipped under the course.** The header now sits above the course (`z-index`), and a glowing hint button swells and sends out two staggered rings that push out and fade, over and over. With reduced motion it's a still ring.
- **The help ladder is now 2, 3 and 4 misses** (was 2, 4 and 6; the founder found 6 too many). Hint 1 glows at 2 misses, hint 2 at 3 (after at least one miss with hint 1 on, so the two never glow together), and guided starts at 4.
- **The ghost hand now draws the eye to the hint button.** When the glow starts, the miss's result is said first. Then, while "Want a hint? Tap the hint button." is said, the hand appears mid-screen, glides to the button, rests 2 s after the line ends, and fades by itself, so it invites a tap without demanding one. It hides at once if the hint is tapped. In a real browser with the recorded lines: the result for about 5 s, then the hand for about 4 s.
- **The hand now fades in where it points** instead of gliding in from its last spot (or the top-left corner the first time), and fades out in place.
- Also: the lab test expected `speak` without the new `onEnd` callback. Fixed.
- **A progress bar** (founder's idea). It's shell-level, so every progression-based game gets the same one. A manifest sets `progress: true` and reports `onProgress({ done, total })` (both new in the contract). The shell then reserves a thin strip above the game, so no game layout can cover it: a 6 px bar in the student tone (`@repo/ui/progress`, a new Mantine `Progress` wrapper) and a muted "2/6". Screen readers get a progressbar named "Tasks done". Fraction Hop reports 0/6 at the start and one more per solved task. `shell-check` uses it too (2 tasks), and the shell test covers it. The strip costs the course about 30 px of height; the tour still fits at 1280 × 650 with a two-row plan.
- **"Want a hint?" sometimes never came.** Running the same failing plan again was a *rerun* (the same hop splashing from the same stone), which the spec said never counts, so a stuck student could rerun forever without help. **Founder's call:** a rerun climbs the help ladder but adds no misconception match (it's no new evidence). Same plan twice now offers hint 1; again, after hint 1, offers hint 2. The planned polish item "refuse an identical rerun" contradicts this, so it's dropped along with its `run.same-plan` line.
- **A separate line for the second hint offer:** `hint.ready-again`, "Want another hint? Tap the hint button again." It gets the same hand nudge.
- **The tutorial opens with `tutorial.welcome`,** "Welcome to Fraction Hop!"
- `pnpm voice` is needed for the 2 new lines (and to delete the orphaned `run.same-plan` recording); `check-voice` fails until then.

### Readings confirmed (2026-10-24)

The founder accepted every remaining reading above as built (distractor units only from task 3, Grade 5 warm-ups past one whole, at least 2 hops per course, each hint tap goes up a level, guided's labels and locked hops, results stay until the next run, long Grade 3–4 routes). Reading 6 was superseded by the founder's call that only hint 1, guided or finding the goal marks it. **Polish is deferred** to its own session, run as a separate visual-polish skill with a clean context (this settles step 10's open question).

## Step 9: starter kit (2026-10-24)

`packages/game-kit` (`@repo/game-kit`). Fraction Hop now runs on it. See its README.

### Decisions

- **The template is a working game, checked in the kit** (`template/`, "tap the bigger unit fraction"), with an example SPEC.md, so the kit's own tests and type check keep it from rotting. It lives under `packages/`, not `games/`, so `@repo/voice` doesn't treat it as a game. `pnpm new-game <slug>` refuses without an approved `games/<slug>/SPEC.md`, copies the template beside it, and registers the game in `apps/play` with `virtual:voice-lines/<slug>`. That's the whole voice wiring; generation stays in `packages/voice`.
- **The fake shell checks the contract on every call** (expectation in the tier, misconception belongs to it, known strings, progress only if the manifest sets it and never backwards, one finish), and the setup file fails the test on any breach.
- **Spec tests:** `describeManifestSpec` covers the header, tiers and misconceptions; games add their own numbers and string families.
- **Tour:** `pnpm tour <slug>` runs `games/<slug>/tour.ts`, starts a dev server if none answers, and finds Chrome itself. **Mutations:** `pnpm mutate <slug>` reads `games/<slug>/mutations.ts`; `survives` records known-harmless survivors.
- **Contract type test:** `packages/game-contract/src/contract.typetest.tsx`, run by `check-types`. Loosening `t`, `expectation`, `misconception`, `tier` or `renderer` to `string` each fails it.
- Moved into the kit from Fraction Hop: art-slot drawing, `useTimers`, seeded random, the test setup. Dropped Fraction Hop's unused `@testing-library/user-event`.

### Results (scratch copy)

Fraction Hop 73 tests, kit 22 + 3, play 127, voice 26; types clean; Biome clean. Fraction Hop's 26 mutations: 24 caught, 2 marked survives (redundant code: `misses > hintSince` is always true after a miss, and the skip's timer clear). A scaffolded game passed its tests, mutations (6/6) and tour. Fraction Hop's tour is clean at G3–5, both sizes.

### Gotchas

- **Two stale dev servers from step 8's scratch session still hold port 3003** and serve that old copy. The tour now says so ("doesn't host <slug>") instead of timing out. Pass `--url` with another port, or kill them.
- **Biome can reflow a `@ts-expect-error` onto a multi-line call**, so it no longer sits on the line with the error. Put the directive inside the object, on the property's line.

### Left open

- Budget checks beyond touch targets (bundle size per game, throttled frame rate) aren't automated.
- The step-4 idea of rendering an art gallery to PNG isn't in the kit.
- `pnpm install` on the host: the lockfile is updated for `@repo/game-kit`.

## Step 10: the skills (2026-10-24)

`build-game`, `review-game`, `add-curriculum` and `polish-game`, in `.claude/skills/`. Each ends with the retro. Cross-references updated: `design-game` (step 2 sends a missing curriculum to `add-curriculum`, step 6 hands off to `build-game`), `docs/agents/skill-retro.md`, DESIGN.md's "Skills" line, and `spec.md`.

### Decisions

- **`build-game` follows Fraction Hop's order:** contract check, scaffold, rules, manifest and spec tests, screen, mutations and tour, voice, the founder plays, log, then `review-game`. It carries the founder's two rules from step 8 (voice and screen take turns with `await say`; the game starts after the shell's start tap) and every gotcha that cost a build time (host-only `pnpm install`, `userEvent` under fake timers, running Vitest from the game's folder, stale dev servers on 3003).
- **Readings vs questions.** `build-game` makes a judgement call that changes nothing evidenced and lists it for the founder (Fraction Hop's 8 readings worked well), and stops to ask about anything that changes a tier, misconception, attempt or string. Every answer goes back into SPEC.md.
- **`review-game` reports, it doesn't fix,** and gives every check a verdict with evidence. Anything it can't measure here (throttled frame rate, touch latency) is "unmeasured", never a pass. It runs in a fresh session where possible.
- **`polish-game` exists now** (spec step 10 made polish its own skill), as a lean first draft. It has no build behind it yet: Fraction Hop's deferred polish is its first run, so expect its retro to rewrite it. Polish never changes what a game teaches or records: those go back to the spec.
- **`add-curriculum` fetches once with `curl` into the scratchpad, then always imports with `--from`.** The script itself fetches and parses in one go, so a parse failure on a new subject's shape would otherwise cost a second request. The skill also flags that `parseExpectationId` only takes `[a-z]+-\d{4}` editions and single-digit grades, so secondary grades or a name like `science-and-technology-2022` need the pattern changed first. It creates an empty `src/<edition>.ts` wired into `index.ts`, so `design-game` only adds entries.
- **All four are model-invoked,** like `design-game`, so one skill can hand off to the next (`build-game` → `review-game`, `design-game` → `add-curriculum`).

### Left open

- Not tested yet: step 11 (the second MVP game) is the first real run of `build-game` and `review-game`. `add-curriculum` and `polish-game` run when first needed.
- `.scratch/playtest-notes/fraction-hop.md` (guided becomes "I added the first hop for you", dragging and reordering blocks) is new founder feedback for Fraction Hop. The guided change is a spec change; dragging may be polish. Not acted on here.
