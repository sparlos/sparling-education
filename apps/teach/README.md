# Teacher app

The teacher app, served at `/teach/` on the same domain as the play shell (`/play/`) and the API. Teachers sign in with their school Google account; signing in here is what makes an account a teacher's. A student account that signs in here gets a plain "this is for teachers" screen.

## Running it

```sh
pnpm dev                                    # everything, including the API and its database
pnpm --filter teach dev                     # http://localhost:3004/teach/
VITE_TEACH_PLATFORM=fake pnpm --filter teach dev   # without the API or Google
pnpm --filter teach test                    # needs Docker, for the contract suite
```

Real sign-in needs a Google OAuth client (Google Cloud console → Credentials → OAuth client ID, type "Web application") with `http://localhost:3004` as an authorised JavaScript origin. Copy `apps/api/.env.example` and `apps/teach/.env.example` to `.env.local` next to them, and put its client ID in both. Without it, the API rejects every sign-in. The platform only needs the client ID: the client secret is for exchanging authorisation codes, which this sign-in doesn't do, so don't put it anywhere.

In development the app reaches the API through Vite's proxy at `/api`, so the session cookie is same-origin, as it is on the shared domain in production. It also proxies `/play` to the play shell's dev server (port 3003), so the class join link and game links it copies open there; run the play shell too (`pnpm dev` does).

## Layout

- `src/platform/ports.ts`: the teacher port, the only way the app talks to the rest of the platform.
- `src/platform/contract.ts`: the port's contract suite. It runs against the in-memory fake (`fake/`) and the API adapter (`api/`) over the in-process API and the test Postgres, so the fake can't drift from the API.
- `src/platform/api/google-button.tsx`: Google's sign-in button. It hands Google's ID token to the port; the API verifies it.
- `src/ui/`: the screens, built from `@repo/ui`. `NewClass.tsx` makes a class; `Share.tsx` is the dashboard's panel with the class join link, the game links and each game's switch; `StudentScreen.tsx` is a student's quick assess, with their plays opened on screen. `App.test.tsx` renders the app over the fake platform, at a URL, with a memory history.
- `src/ui/routes.tsx`: every screen's URL (TanStack Router, code-based routes). Each route loads what its screen needs from the URL's params through the teacher port, so reloading or opening a link shows the same screen; everything for one class lives under `/teach/classes/<classId>/`. Signed out, any URL shows sign-in and then that screen.

## Serving it

Every screen has its own URL, so whatever serves `/teach/` must answer every `/teach/*` path (including ones with dots, like `…/expectations/math-2020.g4.B1.6`) with `index.html`. Vite's dev server and `vite preview` already do.
- `src/main.tsx`: the composition root, and the only file that picks the platform.

## Privacy

The API keeps only Google's opaque subject ID, the first name and the last initial, never the email, full surname or photo, and never logs them. The session is an HTTP-only, same-site cookie, and sign-in only ever returns to a path on this domain.
