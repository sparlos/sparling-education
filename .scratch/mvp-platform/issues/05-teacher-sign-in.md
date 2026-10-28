# 05: Teacher sign-in and the teacher app

**What to build:** A teacher opens `/teach`, signs in with their school Google account, and lands on an empty "your classes" screen. Signing out works. Kindling stores only Google's opaque ID, the first name and the last initial.

**Blocked by:** 04

**Status:** done

- [x] The API verifies Google ID tokens through an injected identity verifier, and tests use a fake verifier. It stores the opaque subject ID, first name and last initial only. Never the email, full surname or photo, including in logs
- [x] Signing in through the teacher app creates a teacher. A student account opening the teacher app sees a plain "this is for teachers" screen
- [x] The session is an HTTP-only, same-site cookie on the shared domain, and sign-in only redirects to same-origin paths
- [x] New `apps/teach` (Vite, React, Mantine through `@repo/ui`) is served at `/teach`. It shows sign-in when signed out and an empty classes screen when signed in
- [x] The teacher app talks to the API only through a teacher port. It has an in-memory fake, a real adapter and a contract suite, and the suite runs against both (the real one over the in-process API and the test Postgres)
- [x] Integration tests cover sign-in, session, sign-out, role separation and that no email is stored. A rendered-app test covers the sign-in flow over the fake port

## Comments

**2026-10-26, agent:** Done in the working tree, uncommitted. The first real tables: `Account` (Google subject, role, first name, last initial) and `Session` (only a SHA-256 of the cookie's token), in migration `accounts_and_sessions`. The API verifies Google ID tokens with `jose` against Google's keys and `GOOGLE_CLIENT_ID` (`googleIdentityVerifier`); without that variable every sign-in is rejected. New routes: `POST /sign-in` (`{ credential, as: "teacher", returnTo? }`, answers with the account and a same-origin `returnTo`), `POST /sign-out`, and `GET /account` (null when signed out). `GET /session` is left for the play shell's student shape in ticket 07. One Google account keeps its first role: a student signing in at `/teach` gets a session as a student, and the app shows "this is for teachers". No endpoint makes a student yet, so tests seed one through `db`. The cookie is `kindling_session`, HttpOnly, SameSite=Lax, Path=/, 30 days, Secure except under `pnpm dev` (the API's dev flag is now `--dev`, which also serves `/reference`). `apps/teach` runs on port 3004 and proxies `/api` to the API, so the cookie is same-origin in development. The teacher port only covers the account and sign-in/out so far. Ticket 06 adds classes. Sign-in uses Google's own button (Google Identity Services), which the tests can't cover; the app's tests use the fake platform's button. Type checks, tests (API 34, teach 16, play 142), builds and `biome check .` pass in the scratch copy. The founder needs to run `pnpm install` on the host (adds `jose` and the new app), and to create a Google OAuth web client to sign in for real (see `apps/teach/README.md`).
