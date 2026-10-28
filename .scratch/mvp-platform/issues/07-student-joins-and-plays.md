# 07: A student joins and plays from the locker

**What to build:** A student opens a class join link, signs in with Google, and joins the class. In a split-grade class they tap their grade once. They land in their locker, which lists the class's games, and tapping one opens it at the tier for their grade.

**Blocked by:** 06

**Status:** done

- [x] Signing in through a class join link creates a student, or reuses an existing one, and creates their membership. A teacher account can't join as a student
- [x] Membership holds the student's grade in that class. It's set automatically in a single-grade class. In a split-grade class the student picks from the class's grades with large buttons that are also spoken
- [x] `GET /session` returns the shape the play shell's `SessionPort` expects, with a real adapter that passes the existing session contract suite. Signed out returns null, and other failures show "try again"
- [x] A minimal locker in the play shell lists the games of every class the student is in that are turned on, and opens one at the right tier, recording which class it was opened for
- [x] The play shell chooses stand-ins or real adapters by environment variable, and the stand-ins remain for API-less development
- [x] The locker stays within the play shell's Chromebook budgets and works without reading (every label is spoken)
- [x] Integration tests cover joining, grade setting, multiple classes and session. Rendered-app tests cover the grade pick and opening a game from the locker

## Comments

**2026-10-27, agent:** A note from ticket 05 on how students sign in. The teacher app uses Google's sign-in button in popup mode: the button hands an ID token to the page, which posts it to `POST /sign-in`. A browser that blocks pop-ups doesn't fall back to anything. Teachers on `/teach` should be fine, but students on school-managed Chromebooks are where a pop-up-blocking policy is most likely, so consider Google's redirect mode for the student sign-in:

- An API endpoint receives Google's form post (`credential` plus the `g_csrf_token` field, which must match the `g_csrf_token` cookie Google sets), verifies the token with the same identity verifier, starts the session, and answers with a 303 to a same-origin `returnTo` (reuse `sameOriginPath` in `apps/api/src/accounts.ts`). The join code or game link has to survive the round trip. A short-lived cookie set before sign-in is the safe choice: `login_uri` must match a registered redirect URI, so check whether Google accepts a query string on it before relying on one.
- Register that endpoint's URL under **Authorised redirect URIs** on the Google OAuth client, for each origin (dev and production).
- Initialise the button with `ux_mode: "redirect"` and `login_uri`, always for students, or as a fallback when the popup is blocked.

It's still an ID token, so it still needs no client secret. Check first whether Chrome on Chromebooks already shows the button as a built-in dialog (FedCM) rather than a pop-up; if it does, redirect mode may not be needed.


**2026-10-28, agent:** Done in the working tree, uncommitted.

- **Schema:** new `Membership` table (migration `memberships`): student, class, `grade` (null until picked in a split class), `joinedAt`. Cascades from both the account and the class.
- **API:** `POST /sign-in/student` takes Google's redirect-mode form post (`credential` plus `g_csrf_token`, checked against Google's `g_csrf_token` cookie), makes a student or reuses the account, and answers 303 to `/play/sign-in` (`?failed` when rejected). An existing teacher stays a teacher. `GET /session` returns the student (id, `en-CA`, a look from `lookFromSeed(id)` until ticket 08 stores looks, and their classes in join order: `classId`, `className`, `grades`, `grade`, and the games that are on), null signed out, and 403 for a teacher. `POST /memberships { joinCode }` joins (case-insensitive and idempotent; 404 for an unknown code, 403 for a teacher). `PUT /memberships/{classId}/grade` picks once from the class's grades (400 for a grade not in the class, 409 once set, 404 when not a member). The API now depends on `@repo/avatar`. The tests that seeded students through `db` now sign in through the form (`signInAsStudent` in `test/client.ts`).
- **Sign-in decision:** students use Google's **redirect mode**, as the ticket 05 note suggested. Where they were headed is kept in localStorage (`kindling.sign-in.next`) rather than carried through Google, so `login_uri` needs no query string. I didn't check whether Chromebooks show the button through FedCM; redirect mode works either way. **The founder needs to add `<origin>/api/sign-in/student` to the OAuth client's Authorised redirect URIs** for `http://localhost:3004`, `http://localhost:3003` and production.
- **Play shell:** the `Student` shape changed: `grade` and `classId` became `classes: Membership[]`. There's a new `MembershipsPort`, and an optional `Platform.SignInButton`. Every play record carries `class`. Routes: `/play/` is the locker, `/play/join/<code>` joins and then opens the locker, `/play/sign-in` is Google sign-in, and `/play/<slug>?class=<id>` opens a game for that class at the student's grade in it (with no `?class`, it uses the first joined class that has the game on). Ticket 09 adds `?join=`. The locker asks a split class's grade first, says "Pick a game to play." aloud, and gives every class name and game name a "Hear it" button. Grade buttons say the grade, then set it. `NotAStudent` shows a spoken "This is for students" screen.
- **Platform choice:** by default the shell runs on the API. `VITE_PLAY_PLATFORM=stand-in` switches to the stand-ins (see `apps/play/.env.example`). Play records still go to the stand-in recorder on the API platform until ticket 10. The play dev server now proxies `/api` the way the teacher app's does. `pnpm tour` starts its own server on the stand-ins and seeds the new student shape. If a server already on 3003 runs on the API, the tour says so.
- **Tests:** the session contract suite now covers joining and grades, and runs against the stand-ins and the real adapters (`api/api.test.ts`, over the test Postgres, so the play shell's tests now need Docker, like the teacher app's). There are rendered-app tests for the locker, the grade pick, the join link, sign-in and opening a game for a class. Results: API 70, play 210, teach 31. Type checks pass across the repo. `pnpm tour fraction-hop` is clean. Biome is clean apart from an import-order complaint in `packages/ui/src/checkbox-group.tsx` that predates this ticket. Headless-Chrome screenshots of the locker and grade pick at 1366 and 360 px found no target under 48 px. The production play bundle's main chunk is 91.7 KB gzipped.
- **The founder needs to:** run `pnpm install` (the lockfile changed: `@repo/avatar` for the API; `@repo/api-client`, `api`, `@repo/db` and `@types/node` for play), apply the migration (`pnpm dev` does this), register the redirect URIs above, and set `VITE_GOOGLE_CLIENT_ID` in `apps/play/.env.local`.
