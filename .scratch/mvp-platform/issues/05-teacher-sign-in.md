# 05: Teacher sign-in and the teacher app

**What to build:** A teacher opens `/teach`, signs in with their school Google account, and lands on an empty "your classes" screen. Signing out works. Kindling stores only Google's opaque ID, the first name and the last initial.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] The API verifies Google ID tokens through an injected identity verifier, and tests use a fake verifier. It stores the opaque subject ID, first name and last initial only. Never the email, full surname or photo, including in logs
- [ ] Signing in through the teacher app creates a teacher. A student account opening the teacher app sees a plain "this is for teachers" screen
- [ ] The session is an HTTP-only, same-site cookie on the shared domain, and sign-in only redirects to same-origin paths
- [ ] New `apps/teach` (Vite, React, Mantine through `@repo/ui`) is served at `/teach`. It shows sign-in when signed out and an empty classes screen when signed in
- [ ] The teacher app talks to the API only through a teacher port. It has an in-memory fake, a real adapter and a contract suite, and the suite runs against both (the real one over the in-process API and the test Postgres)
- [ ] Integration tests cover sign-in, session, sign-out, role separation and that no email is stored. A rendered-app test covers the sign-in flow over the fake port
