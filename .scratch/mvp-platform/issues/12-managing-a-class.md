# 12: Managing a class

**What to build:** A teacher turns games off and on for a class, changes a student's grade, removes a student, and switches between their classes.

**Blocked by:** 07, 21

**Status:** ready-for-human

- [x] Turning a game off removes it from students' lockers, and its game link shows the "turned off" message. Turning it back on restores both
- [x] Changing a student's grade changes the tier of their next plays. Existing results keep their tier
- [x] Removing a student takes them out of the class's dashboard and their locker no longer lists that class. Their results for the class are kept out of the teacher's views
- [x] A teacher with several classes switches between them, and the dashboard shows one class at a time
- [x] Integration and rendered-app tests cover each action and the teacher-only access rules

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit.

- **API:** `PUT /classes/{classId}/games/{slug}` `{ on }` turns a game on or off and returns the class. `GET /classes/{classId}/students` lists the class's students with their grades. `PUT /classes/{classId}/students/{studentId}/grade` sets a grade to one of the class's (400 otherwise), whether or not the student picked one; after that the student's own pick gets 409. `DELETE /classes/{classId}/students/{studentId}` removes them. All are teacher-only, and answer 404 for another teacher's class or a student who isn't in it.
- **Removing keeps the plays.** Only the membership is deleted, and every teacher view already reads members' plays only, so the results are out of sight. If the student joins again, their results come back. Records still queued on their device for that class get a 400 and are dropped, like any other record for a class they aren't in.
- **Grade changes** need nothing more: records keep their tier, so earlier results show "From the Grade N tier" on the dashboard.
- **Teacher port:** `switchGame`, `students`, `setStudentGrade` and `removeStudent`, in the fake and the API adapter. A new `managingContract` suite runs against both. The fake's dashboard now drops expectations of games that are off unless a student has evidence for them, as the API does.
- **Teacher app:** a "Manage class" screen at `/teach/classes/<classId>/manage`, reached from the dashboard and from each class card. Each game has an on/off switch with a line saying what on and off mean. In a split class, each student shows their grade, with a "Change grade" button that opens radios, Save and Cancel, then confirms the change in a line. A single-grade class shows no grade controls. "Remove" asks for confirmation first. A change that fails says "That didn't save." The dashboard has a row of links to the teacher's classes when they have more than one, with the current one marked.
- **`@repo/ui`:** new `switch` and `radio-group` wrappers.
- **Tests:** API 162 (10 new in `managing.test.ts`), teach 104 (the managing contract on both platforms, plus 10 new rendered-app tests), play 281 (the game-off test now uses the route, and also turns the game back on). Type checks pass. Biome is clean apart from the old import-order complaint in `packages/ui/src/checkbox-group.tsx`. Checked the manage screen in headless Chrome at 1366 and 360 px: no target under 44 px, no sideways scroll. One play test, the game-off spoken message, failed once in a full run and passed in five runs after that, so it may be flaky under load.
- **The founder needs to:** restart `pnpm dev` so the API serves the new routes and the client is regenerated. No new dependencies, no migration, no new spoken lines.
