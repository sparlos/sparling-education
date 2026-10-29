# 21: Routing in the teacher app

**What to build:** Every screen in the teacher app has its own URL, so the browser's back and forward buttons, reloading, bookmarks and shared links all work. Today the app keeps a stack of views in React state (`Home` in `apps/teach/src/ui/App.tsx`), so going back leaves the app and a reload starts over at the classes screen. Use TanStack Router (founder's call). Do this before any other ticket.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] TanStack Router, with type-safe routes and params, under the app's `/teach/` base. Code-based route definitions are fine. If you'd rather use file-based routing, check first that its Vite plugin runs in the sandbox's scratch copy and in the founder's Mac build
- [ ] One URL per screen, each readable and shareable, for example:
  - `/teach/`: your classes
  - `/teach/classes/<classId>`: the dashboard
  - `/teach/classes/<classId>?misconception=<game>|<id>`: the dashboard, with that misconception open in the strip (a search param, so opening and closing it doesn't pile up history entries: use `replace`)
  - `/teach/classes/<classId>/students/<studentId>/expectations/<expectationId>`: a cell's evidence
  - `/teach/classes/<classId>/students/<studentId>/plays/<playId>`: a play
- [ ] Browser back and forward move between those screens. The in-app back buttons go to the screen above (the play's back button goes to its student's evidence for the play's expectation, the evidence's to the dashboard), so they work on a page opened straight from a link, with no history behind it
- [ ] Reloading, or opening a URL in a new tab, shows the same screen. Screens load what they need from their URL params through the teacher port, so they no longer need the `Class` object or the student's name passed down from the screen before
- [ ] Signed out: any URL shows sign-in, then the screen that was asked for. A student account still gets "This is for teachers"
- [ ] A URL for a class, student, expectation or play the teacher can't see (not theirs, gone, or made up) shows a plain "not found" with a way back to their classes, never a blank screen or a stack trace. An unknown path does the same
- [ ] Links between screens are real links where they navigate (`<a href>` through the router's `Link`), so middle-click and "open in new tab" work. Toggles that don't navigate, like opening a misconception, stay buttons. Add a `Link` wrapper (or an `href`/`component` prop on existing ones) to `@repo/ui` if you need one, per `.claude/rules/ui.md`
- [ ] Scroll goes back to where it was on back, and to the top on a new screen
- [ ] The production build serves the deep URLs: check how `/teach/` is served (Vite preview, and whatever serves it in production) and make sure every `/teach/*` path falls back to `index.html`
- [ ] Tests: the existing rendered-app tests keep passing over the router, with a memory history. Add tests that: each URL above renders its screen when opened directly; back and forward move through dashboard → evidence → play and back; the misconception search param opens it in the strip; a URL for another teacher's class shows "not found"; signing in returns to the URL asked for. Check the look at 1366 and 360 px in headless Chrome as usual

## Notes

- The play shell (`apps/play`) is out of scope. It routes with full page loads (`play/routes.ts`), so back and forward already work there.
- Later teacher screens (student page, class settings, quick assess, the walkthrough) add their routes on top of this, so get the route tree's shape right for them: everything for one class lives under `/teach/classes/<classId>/`.
