# 06: Create a class and copy its links

**What to build:** A signed-in teacher creates a class by giving it a name and its grade or grades (3–5). Every game is turned on. The teacher can copy the class join link and a game link for any game in the class.

**Blocked by:** 05

**Status:** done

- [x] A class has a name, one teacher, one or more grades, a join code and which games are on. All hosted games are on by default
- [x] The teacher sees their classes and can create one in a single short form
- [x] The class join link and each game link (one game, one class, carrying the join code) can be copied in one tap
- [x] A teacher can only see and change their own classes (integration tested)
- [x] The teacher port and its contract suite are extended. Rendered-app tests cover creating a class and copying links

## Comments

**2026-10-27, agent:** Done in the working tree, uncommitted. New `Class` table (migration `classes`): teacher, name, grades (`Int[]`, ascending), a unique 8-character join code (no 0/O, 1/I/L or U), and `gamesOff`, the slugs a teacher turned off. Storing what's off rather than what's on means a game Kindling starts hosting later is on in every existing class; ticket 12 writes to it. The hosted games the API knows are in `apps/api/src/games.ts` (Fraction Hop only), which has to be kept in step with the play shell's registry by hand. New routes: `GET /classes`, `POST /classes` (`{ name, grades }`, name 1–60 characters after trimming, grades from 3–5) and `GET /classes/{classId}`. Each answers 401 signed out and 403 for a student, and another teacher's class is a 404, the same as one that doesn't exist. The link formats are set here, and tickets 07 and 09 have to make the play shell read them: the class join link is `/play/join/<code>` and a game link is `/play/<slug>?join=<code>`. The API returns them as paths; the teacher port turns them into full URLs on the page's origin. The teacher port gained `classes()` and `createClass()`, and the contract suite covers them against the fake and the real API. The classes screen has a "New class" form (name plus Grade 3/4/5 checkboxes), and each class card shows its join link and one "Copy game link" button per game that's on. `@repo/ui` gained `CheckboxGroup` (also on `/design`) and a `maxLength` on `TextInput`. Biome, type checks, builds and tests (API 46, teach 31, play) pass in the scratch copy. No new dependencies. The founder needs to apply the migration (`pnpm dev` does this).


**2026-10-27, agent:** Links are built on the page's origin, which in development is the teacher app's dev server (3004), so they 404'd there. `apps/teach/vite.config.ts` now proxies `/play` to the play shell's dev server (3003), the way it proxies `/api`, so copied links open the play shell as they will on the shared domain. The play shell still shows "not found" for `/play/join/<code>` until ticket 07 handles it.
