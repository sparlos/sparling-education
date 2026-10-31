# The platform seam

The play shell needs six things from the rest of the platform. It reaches each one only through a port in [`ports.ts`](./ports.ts):

| Port | What it does | Real adapter (`api/`) | Stand-in (`stand-ins/`) |
| --- | --- | --- | --- |
| `SessionPort` | Who is signed in: their ID, locale, avatar look, and the classes they're in with their grade in each | `GET /session` | A pretend student picked on the stand-in sign-in screen, kept in this browser's localStorage |
| `MembershipsPort` | Joining a class by its join code, and picking a grade in a split class | `POST /memberships`, `PUT /memberships/{classId}/grade` | Adds stand-in classes to the stored student. Any join code names one: `G4` is Grade 4, `G45` a Grade 4/5 split, a code with no digits Grades 3–5, a code starting with `X` no class |
| `LockerPort` | The outfit pieces and stickers the student owns, the rewards and recognition they haven't seen yet, where their stickers are on the locker, and dressing their avatar (designing it the first time, then the wardrobe) | `GET /locker`, `PUT /locker/look`, `POST /locker/seen`, `PUT /locker/stickers` | Owns the base set, plus rewards granted with `standInGrant` or earned with `standInEarn` (each finished play earns the next one, with no effort rule or cap) and recognition given with `standInRecognise`, and sticker placements, all kept in localStorage; the look is kept on the stored student |
| `PlayRecordsPort` | Stores each play's records: its attempts, then how it ended; and whether the student has played a game before | `POST /play-records`, `GET /games/{slug}/played` | Kept in memory and logged to the console; the games each student has played are kept in localStorage (`stand-in.played`), so a reload knows a returning student |
| `LinksPort.signIn` | The sign-in page, returning to where the student was headed | `/play/sign-in`: Google's button in redirect mode | `/play/__stand-in/sign-in` |
| `LinksPort.locker` | Where every game returns the student, naming the play | The locker, `/play/?play=<play>` | The same |

`src/main.tsx` is the only file that picks the platform: the real one, or the stand-ins with `VITE_PLAY_PLATFORM=stand-in` (see `apps/play/.env.example`). The shell's own tests use the stand-ins. Every stand-in opens with a `STAND-IN` header comment, and nothing outside `stand-ins/`, `src/main.tsx` and tests imports one.

The contract suites in [`contract.ts`](./contract.ts) run against both: `stand-ins/stand-ins.test.ts`, and `api/api.test.ts`, which runs the real adapters against the API in-process over the test Postgres (Docker must be running; see `docs/agents/testing.md`).

## Student sign-in

Students sign in with Google's button in **redirect mode**, not the pop-up the teacher app uses, since school Chromebooks may block pop-ups:

1. `links.signIn(returnTo)` opens `/play/sign-in?next=<returnTo>`. The page keeps `next` in localStorage (`sign-in.next`), since the trip through Google can't carry it, and shows Google's button.
2. Google posts the ID token, with its `g_csrf_token` double-submit field, to the API's `POST /sign-in/student` (Google's `login_uri`). The API checks the field against Google's `g_csrf_token` cookie, verifies the token, makes a student if the account is new, starts the session and answers 303 to `/play/sign-in` (or `/play/sign-in?failed`).
3. Signed in now, `/play/sign-in` sends the student on to the remembered page, only ever a page of the shell, or the locker.

An existing account keeps its role, so a teacher signing in here gets a session as a teacher, and the shell says it's for students (`SessionPort.current` rejects with `NotAStudent`).

## The endpoints the shell needs

### `GET /session` → `Student | null`

```ts
{
  id: string;          // stable, opaque; never an email or a name
  locale: "en-CA" | "fr-CA";
  look: AvatarLook | null; // from @repo/avatar, checked with parseLook; null until they design their avatar
  classes: {           // in the order they joined
    classId: string;
    className: string;
    grades: number[];  // the class's grades, ascending
    grade: number | null; // theirs, which chooses the tier; null until picked in a split class
    games: { slug: string; name: string }[]; // the class's games that are on
  }[];
}
```

- Signed out returns `null`. It never redirects; the shell decides where the student goes.
- A student with no look (or one that no longer parses) designs their avatar before anything else: before the locker, a grade pick or a game.
- A teacher's session answers 403, which the adapter turns into `NotAStudent`.
- Any other failure rejects. The shell shows "try again" rather than sending a signed-in student to sign-in.

A game opens for one class, and that class's grade picks the tier, and every play record carries the class:

- **A teacher's game link**, `/play/<slug>?join=<code>`, is for the class with that join code. Signed out, the student goes to sign-in and comes back to the link. The shell joins them to the class (`POST /memberships`, which finds them if they're already in it), has them pick their grade first in a split class, then opens the game. A join code no class has, or a class with the game turned off, gets a spoken message and a way to the locker.
- **The locker's links**, `/play/<slug>?class=<id>`, are for that class, or else the first the student joined that has the game on and their grade set.

### `GET /locker` → `Locker`, `PUT /locker/look` with `AvatarLook` → `AvatarLook`, `POST /locker/seen` with `{ rewards: string[] }` → 204, `PUT /locker/stickers` with `{ placements }` → `{ placements }`

```ts
{
  owned: string[];    // outfit item IDs: the base set (`baseSet` in @repo/avatar/parts) and rewards
  stickers: string[]; // sticker IDs from @repo/rewards: earned ones in the order granted, then recognition stickers
  unseen: string[];   // rewards, then recognition stickers, not yet revealed
  placements: { sticker: string; x: number; y: number }[]; // on the locker, the one underneath first; x and y are the centre, 0 to 1
}
```

- Recognition from a teacher gives the student the trait's sticker (`recognition-<trait>`, drawn as a rosette by `@repo/rewards/sticker`), once however often they're recognised for it. Each time they're recognised it's new again until `/locker/seen` names the sticker.
- `PUT /locker/stickers` replaces every placement: stickers left out come off. A sticker the student doesn't own answers 400, which the adapter turns into `NotOwned`; only the signed-in student's locker changes.

- Rewards come from `@repo/rewards`' catalogue, in its order, never at random. The API grants them when a play ends, from that week's effort, up to a weekly cap (`rewardRule` in the API's scoring module). A crashed play grants nothing and takes nothing; a grant is never taken back.
- The locker reveals `unseen` whenever it opens, so rewards from a play sent late (offline) are revealed on a later visit. The student's tick posts them to `/locker/seen`; until then they stay new, across reloads. Reaching the cap shows nothing.

- Skin tones (`body`) and `hair` are everyone's; `top`, `bottom`, `shoes` and `hat` must be owned. A look with a piece the student doesn't own answers 400, which the adapter turns into `NotOwned`.
- The look is stored on the student and returned by `GET /session` from then on.

### `POST /play-records` with `PlayRecord[]` → `{ stored: number }`

Every record carries:

```ts
{
  id: string;            // made by the shell; the idempotency key
  play: string;          // groups one play's records into its result
  student: string;       // must equal the session's student, or reject the batch with 403
  class: string;         // the class the play was opened for; its results go there
  game: string;          // slug
  gameVersion: number;   // results keep the version they were earned under
  tier: string;
  at: string;            // ISO 8601, device clock
}
```

plus, by `kind`:

```ts
// One try at one task.
{
  kind: "attempt";
  task: string;          // the same task ID across retries of one task
  expectation: string;   // ExpectationId, edition included: "math-2020.g4.B1.5"
  succeeded: boolean;
  misconception?: string;
  assisted?: "hint" | "demonstration" | "guided";
  asked?: string;        // what the task asked, for teachers: same on every try at it
  detail?: string;       // what the student did on this try, for teachers
  exploring?: boolean;   // a try that only explored: never succeeded, never scored
}

// How the play ended. At most one per play, after its attempts.
{
  kind: "end";
  ending: "finished" | "left" | "crashed";
}
```

- **Idempotent by `id`.** The shell retries until it gets a 2xx, so a batch can arrive twice when a response is lost. Store each ID once and answer 2xx for duplicates.
- **In order.** Within a play, records arrive in the order they were made, so a play's `end` comes after its attempts. A batch can hold records from more than one play when leftovers are sent.
- **How a play ended is evidence.** `finished` means the game reached its end. `left` means the student chose to stop partway. `crashed` means the game broke, through no choice of the student's, so it must never count against their effort. A play with no `end` record was abandoned (the tab closed or the device died), and its `end` may still arrive later.
- **Batches hold at most 25 records.** They can arrive late: the shell keeps unsent records on the device and sends them on the student's next play, even days later. Trust `at` for when something happened, not the arrival time.
- **The adapter rejects only on failures where retrying can help:** network errors, timeouts, 5xx and 429. Those batches are retried. A 4xx means the batch will never be accepted, so the adapter logs it and resolves, and the shell doesn't retry it forever.
- Validate `game`, `gameVersion`, `tier`, `expectation` and `misconception` against the game's manifest at that version (`attemptProblem` in `@repo/game-contract`, which the shell uses too). The shell already drops attempts its manifest doesn't allow, and attempts made after a play ended.
- The API answers 200 with how many of the batch's records were new. It refuses the whole batch with 400 for a record its manifest or the student's classes don't allow, an attempt or second end added to a play that has ended, or more than 25 records, and with 403 when a record is another student's. Nothing in a refused batch is stored.
- Scoring, results and rewards are computed from these records server-side, in the API's scoring module (see ADR 0002).

### `GET /games/{slug}/played` → `{ played: boolean }`

- Whether the signed-in student has played the game before: true once any of their records for it is stored, from any class, at any tier, including a play that only crashed. Nothing new is stored for it.
- The shell asks as the game loads, and passes the answer to the game as `firstPlay` when the student taps start. It never waits for it: an answer that hasn't come by then, or a failure, counts as a first play, since showing a tutorial again beats leaving a new student without one.
- Records can arrive late, so a play on another device may not count yet. At worst, the tutorial plays one extra time.

### Links

- `signIn(returnTo)`: see "Student sign-in" above. `returnTo` is always a path on the shared domain, and sign-in only ever returns to a page of the shell.
- `locker(play)`: the locker, where every game returns the student however the play ended, naming the play. The reveal doesn't need it: it shows every reward not yet seen, which includes what the play earned once its end is stored.
