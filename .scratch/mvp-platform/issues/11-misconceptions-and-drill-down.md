# 11: Misconception strip and drill-down

**What to build:** Above the grid, the teacher sees the misconceptions showing up in their class, ordered by how many students showed each, and opens one to see who. Opening a cell shows that student's evidence for that expectation. Opening a play shows its attempts in order.

**Blocked by:** 10

**Status:** done

- [x] The misconception strip lists the misconceptions revealed in recent plays, each with its description and the number of students who showed it. Opening one lists those students
- [x] The cell view shows the games, tiers, misconceptions and change over time for that student and expectation
- [x] The play view shows each task's attempts, retries, help used and how the play ended
- [x] Every view is reachable in one tap from the one above it, and back
- [x] Integration tests cover the strip and drill-down data. Rendered-app tests cover moving from the strip and from a cell down to a play

## Comments

**2026-10-29, agent:** Done in the working tree, uncommitted.

- **Misconception wording:** manifests had no teacher-facing words for a misconception, so `Misconception` in `@repo/game-contract` now has a required `description`, the sentence from the game spec's teacher card. `describeManifestSpec` checks it word for word against the teacher card's `- \`id\`: "…"` lines. Fraction Hop, the starter-kit template (manifest and SPEC.md), the test and dev manifests, and design-game's SPEC-TEMPLATE.md are updated. Not a version bump: it changes nothing evidenced.
- **Strip rule (provisional, in `misconceptionRule` in `scoring.ts`):** a student shows a misconception when any attempt in their 5 most recent plays of that game revealed it. Crashed plays are left out, as for understanding. A student counts once per misconception however often they showed it. Ties in the strip go by game name, then ID. **Please review the 5-play window along with the band thresholds.**
- **API:** `GET /classes/{id}/dashboard` now has `misconceptions`, each with its game, description and students (and, for each student, the expectation of the latest attempt that showed it, so the strip opens on the right evidence). New: `GET /classes/{classId}/students/{studentId}/expectations/{expectationId}` (the cell: results per tier, own grade first, then every play with evidence for it, oldest first, with tasks on their own / with help / not yet, misconceptions, ending, and whether the result counts it) and `GET /classes/{classId}/students/{studentId}/plays/{play}` (each task's attempts in order, with help, misconception and how it ended, or null until the end arrives). Both are for the class's teacher only (404 otherwise) and only show plays for that class.
- **Teacher app:** port `evidence()` and `play()`, with fake and API adapters, both passing new contract tests. Above the grid, "Misconceptions showing up" lists each one ("3 students", the description, the game). Tapping one opens its students, and each student opens their evidence. Each grid cell that has evidence is now a button to that student's evidence. A no-evidence cell isn't. The evidence screen's play cards open the play. Each screen has a back button to the one above, and the dashboard comes back with the same misconception open. The fake's sample class now shows misconceptions.
- **Tests:** API 131 (new: `drill-down.test.ts`, plus strip tests in `dashboard.test.ts`), teach 58, play 272, Fraction Hop 78, game-kit 26. Type checks and Biome are clean on everything touched. Headless Chrome at 1366 and 360 px: no page overflow on the dashboard, evidence or play screens, and every button is at least 48 px tall. I fixed one overflow: the cells' visually hidden labels were widening the page on a phone.
- **The founder needs to:** nothing new to install. Turbo regenerates `openapi.json` and the API client. `@repo/api-client`'s index now exports `getEvidence` and `getPlay`.

