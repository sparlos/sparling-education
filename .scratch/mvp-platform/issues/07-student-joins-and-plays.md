# 07: A student joins and plays from the locker

**What to build:** A student opens a class join link, signs in with Google, and joins the class. In a split-grade class they tap their grade once. They land in their locker, which lists the class's games, and tapping one opens it at the tier for their grade.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Signing in through a class join link creates a student, or reuses an existing one, and creates their membership. A teacher account can't join as a student
- [ ] Membership holds the student's grade in that class. It's set automatically in a single-grade class. In a split-grade class the student picks from the class's grades with large buttons that are also spoken
- [ ] `GET /session` returns the shape the play shell's `SessionPort` expects, with a real adapter that passes the existing session contract suite. Signed out returns null, and other failures show "try again"
- [ ] A minimal locker in the play shell lists the games of every class the student is in that are turned on, and opens one at the right tier, recording which class it was opened for
- [ ] The play shell chooses stand-ins or real adapters by environment variable, and the stand-ins remain for API-less development
- [ ] The locker stays within the play shell's Chromebook budgets and works without reading (every label is spoken)
- [ ] Integration tests cover joining, grade setting, multiple classes and session. Rendered-app tests cover the grade pick and opening a game from the locker

## Comments

**2026-10-27, agent:** A note from ticket 05 on how students sign in. The teacher app uses Google's sign-in button in popup mode: the button hands an ID token to the page, which posts it to `POST /sign-in`. A browser that blocks pop-ups doesn't fall back to anything. Teachers on `/teach` should be fine, but students on school-managed Chromebooks are where a pop-up-blocking policy is most likely, so consider Google's redirect mode for the student sign-in:

- An API endpoint receives Google's form post (`credential` plus the `g_csrf_token` field, which must match the `g_csrf_token` cookie Google sets), verifies the token with the same identity verifier, starts the session, and answers with a 303 to a same-origin `returnTo` (reuse `sameOriginPath` in `apps/api/src/accounts.ts`). The join code or game link has to survive the round trip. A short-lived cookie set before sign-in is the safe choice: `login_uri` must match a registered redirect URI, so check whether Google accepts a query string on it before relying on one.
- Register that endpoint's URL under **Authorised redirect URIs** on the Google OAuth client, for each origin (dev and production).
- Initialise the button with `ux_mode: "redirect"` and `login_uri`, always for students, or as a fallback when the popup is blocked.

It's still an ID token, so it still needs no client secret. Check first whether Chrome on Chromebooks already shows the button as a built-in dialog (FedCM) rather than a pop-up; if it does, redirect mode may not be needed.
