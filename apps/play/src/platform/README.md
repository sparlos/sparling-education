# The platform seam

The play shell needs five things from the rest of Kindling. It reaches each one only through a port in [`ports.ts`](./ports.ts):

| Port | What it does | Real adapter (`api/`) | Stand-in (`stand-ins/`) |
| --- | --- | --- | --- |
| `SessionPort` | Who is signed in: their ID, locale, avatar look, and the classes they're in with their grade in each | `GET /session` | A pretend student picked on the stand-in sign-in screen, kept in this browser's localStorage |
| `MembershipsPort` | Joining a class by its join code, and picking a grade in a split class | `POST /memberships`, `PUT /memberships/{classId}/grade` | Adds stand-in classes to the stored student. Any join code names one: `G4` is Grade 4, `G45` a Grade 4/5 split, a code with no digits Grades 3–5, a code starting with `X` no class |
| `PlayRecordsPort` | Stores each play's records: its attempts, then how it ended | **None yet** (ticket 10): `main.tsx` gives the real platform the stand-in | Kept in memory and logged to the console |
| `LinksPort.signIn` | The sign-in page, returning to where the student was headed | `/play/sign-in`: Google's button in redirect mode | `/play/__stand-in/sign-in` |
| `LinksPort.hub` | Where a game opened from a portal returns to | The locker, `/play/?play=` (ticket 09 replaces this port) | A placeholder screen, `__stand-in/hub` |

`src/main.tsx` is the only file that picks the platform: the real one, or the stand-ins with `VITE_PLAY_PLATFORM=stand-in` (see `apps/play/.env.example`). The shell's own tests use the stand-ins. Every stand-in opens with a `STAND-IN` header comment, and nothing outside `stand-ins/`, `src/main.tsx` and tests imports one.

The contract suites in [`contract.ts`](./contract.ts) run against both: `stand-ins/stand-ins.test.ts`, and `api/api.test.ts`, which runs the real adapters against the API in-process over the test Postgres (Docker must be running; see `docs/agents/testing.md`).

## Student sign-in

Students sign in with Google's button in **redirect mode**, not the pop-up the teacher app uses, since school Chromebooks may block pop-ups:

1. `links.signIn(returnTo)` opens `/play/sign-in?next=<returnTo>`. The page keeps `next` in localStorage (`kindling.sign-in.next`), since the trip through Google can't carry it, and shows Google's button.
2. Google posts the ID token, with its `g_csrf_token` double-submit field, to the API's `POST /sign-in/student` (Google's `login_uri`). The API checks the field against Google's `g_csrf_token` cookie, verifies the token, makes a student if the account is new, starts the session and answers 303 to `/play/sign-in` (or `/play/sign-in?failed`).
3. Signed in now, `/play/sign-in` sends the student on to the remembered page, only ever a page of the shell, or the locker.

An existing account keeps its role, so a teacher signing in here gets a session as a teacher, and the shell says it's for students (`SessionPort.current` rejects with `NotAStudent`).

## The endpoints the shell needs

### `GET /session` → `Student | null`

```ts
{
  id: string;          // stable, opaque; never an email or a name
  locale: "en-CA" | "fr-CA";
  look: AvatarLook;    // from @repo/avatar; the adapter checks it with parseLook
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
- A teacher's session answers 403, which the adapter turns into `NotAStudent`.
- Any other failure rejects. The shell shows "try again" rather than sending a signed-in student to sign-in.

A game opens for one class: the one `?class=<id>` names (the locker's links carry it), or else the first the student joined that has the game on and their grade set. That class's grade picks the tier, and every play record carries the class.

### `POST /play-records` with `PlayRecord[]` → 2xx

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
- Validate `game`, `gameVersion`, `tier`, `expectation` and `misconception` against the game's manifest at that version. The shell already drops attempts its manifest doesn't allow, and attempts made after a play ended.
- Scoring, results and rewards are computed from these records server-side, and are out of scope here (see ADR 0002).

### Links

- `signIn(returnTo)`: see "Student sign-in" above. `returnTo` is always a path on the shared domain, and sign-in only ever returns to a page of the shell.
- `hub({ portal, play })`: the locker, naming the play so it can reveal the rewards it earned (ticket 14). Ticket 09 replaces it with a locker link.
