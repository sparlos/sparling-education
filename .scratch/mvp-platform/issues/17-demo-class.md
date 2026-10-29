# 17: Demo class

**What to build:** Every new teacher gets a demo class of about 24 simulated students across Grades 3–5, with results already in and clear misconception patterns. They can view it as one of its students, and delete it in one step.

**Blocked by:** 11, 13, 21, 23

**Status:** ready-for-human

- [x] A demo class is created at a teacher's first sign-in, alongside their real classes and clearly labelled
- [x] Its plays are generated deterministically from each hosted game's manifest (tiers, expectations, misconceptions) and its simulator (below), so a new game shows up in it automatically. The data looks plausible, and some misconceptions are shared by several students
- [x] Demo plays look like real ones all the way down to the play view (tickets 22 and 23): every try, exploring ones included, with what each task asked and what each try did. A manifest can't describe tasks, so each game provides a simulator from its own rules (`src/rules/`, no React): given a seed, a tier and a simulated student's tendencies (accuracy, the misconceptions they hold, how often they take help), it plays a whole play and returns the attempts the game would have sent. The demo seeder calls each hosted game's simulator. `build-game` makes the simulator part of every game, and Fraction Hop gets one
- [x] Demo results go through the same scoring as real ones, and demo students have effort and some rewards
- [x] "View as a student" opens the locker as one demo student. Plays made there count only in the demo class
- [x] Deleting the demo class removes it and everything in it in one step, and it never comes back
- [x] Integration tests cover seeding, determinism, isolation from real classes and deletion. Rendered-app tests cover delete and view as a student

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit.

- **Seeding** (`apps/api/src/demo.ts`): at a teacher's first sign-in (`giveDemoClass`, once, guarded by `Account.demoGiven`), "Demo class", Grades 3–5, 24 simulated students (8 a grade). Each plays 3–5 plays of every hosted game, over the last three school weeks, by calling the game's `simulate`. Plays are stored as play records and rewards granted by `grantRewards`, so results, effort and rewards go through the real scoring. Earlier weeks' rewards are marked seen; this week's are new in the locker. It takes about 0.7 s inside the sign-in request.
- **Generated from manifests:** a student holds misconceptions by position ("the tier's 1st/2nd/3rd misconception, in manifest order"), never by name, so a new game's misconceptions show up in the demo class without anyone listing them. Today: 10 students showing consistently, 8 developing, 6 not yet; misconceptions shared by 7, 4 and 3 students.
- **Simulator** (contract: `Simulate` and `SimulatedStudent` in `@repo/game-contract`). Fraction Hop's is `games/fraction-hop/src/rules/simulate.ts` (export `./simulate`). It drives `startTask`/`addBlock`/`tapHint`/`finishRun`, so attempts carry probes, misses, reruns, help, `asked` and `detail` exactly as the game sends them. Mistakes follow a held misconception where the course allows it; other mistakes are slips that match none. The template game has one too, and `build-game` now requires it (step 3) and says to host the game in the API with it (step 8). Three new mutations in `mutations.ts`.
- **View as a student:** `POST /demo-class/view-as-student` sets `Session.viewingAsId` on the teacher's session, so student routes (`/session`, `/locker`, `/play-records`, …) act as the demo class's first student by name (Amara O.), while teacher routes stay the teacher's. The teacher app opens `/play/` in a new tab. Plays count only in the demo class: a demo student can't join any other class, and no real student can join a demo class (both 404).
- **Recognition** (founder's ask): `demoRecognition` in `demo.ts` gives 6 students recognition this term (Léa for two traits) and 3 last term, a few days apart. Most of the class is still "not yet recognised this term", and last term's show on the student page. All are seen except Amara's kindness, so viewing as her reveals the sticker as new in her locker. The fake does the same.
- **Delete:** `DELETE /demo-class`. Demo students hang off the class (`Account.demoClassId`, cascade), so one delete removes the class, its students, their plays, rewards, placements and sessions. Viewing-as sessions fall back to `null`. It never comes back.
- **Teacher app:** "Demo" badge and no share links on the classes screen. On its dashboard, a card with "View as a student" and "Delete demo class" (with an inline confirm). Port: `Class.demo`, `deleteDemoClass()`, `viewDemoAsStudent()`, and a new `demoClassContract` run against the fake and the real API. The fake builds its demo class from try patterns (it can't run simulators). It's on in `VITE_TEACH_PLATFORM=fake` and off by default in tests.
- **Readings for the founder:**
  1. The API test client (`apps/api/test/client.ts`) and the existing contract suites run with `demoClass: false`, so their teachers start with no classes. `demo.test.ts` and `demoClassContract` run with it on, as production does.
  2. Which student "view as a student" opens: always the first by name. There's no picker.
  3. Signing out in the play shell while viewing as a student signs the teacher out (it's one session cookie).
  4. Existing teacher accounts in the dev database get a demo class at their next sign-in (the migration defaults `demoGiven` to false).
  5. The demo card's buttons are the app's standard 44 px buttons, like "Quick assess" next to them, under the 48 px rule.
- **The founder needs to:** run `pnpm --filter @repo/db generate` and `pnpm --filter api generate && pnpm --filter @repo/api-client generate` on the Mac (schema and API changed; the generated client isn't committed), and apply the new migration (`pnpm dev` does it).
- Checked: API (247 tests), teacher app (160), play shell (313), Fraction Hop (109, including 10 simulator tests), the template's simulator tests, types, Biome, `pnpm mutate fraction-hop` (all 39 caught or explained), and a headless Chrome look at 1366 and 360 px (no sideways scroll).
- Follow-up for when the other games come in: ticket 27.
