# 16: Quick assess

**What to build:** A teacher views quick assess for their class or for one student: a summary for writing report cards that states which curriculum expectations and Learning Skills each piece of evidence contributes to, without assigning a level or rating. It prints cleanly from the browser.

**Blocked by:** 11, 13, 21

**Status:** ready-for-human

- [x] Class and student quick assess are screens in the teacher app, reached from the dashboard and the student page
- [x] Each piece of evidence names its expectations (product-layer descriptions only, per ADR 0001), its tier and the Learning Skills it contributes to. No level, rating or mark appears anywhere
- [x] The print stylesheet hides navigation, never splits a row across pages, is legible in greyscale, and puts the class or student and the date in the page header
- [x] Integration tests cover the quick-assess data. Rendered-app tests cover both views
- [ ] The founder checks print preview of a class and a student by hand before closing

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check print preview and commit.

- **Laid out as a report card is written, per the founder:** one block per student, in three parts:
  - **Math: what their plays show.** One line per expectation (Kindling's descriptions only, ADR 0001), as plain counts: "3 of 4 tasks on their own, in their 2 most recent plays", the games and dates, and ", not their grade" for another tier. The plays are the ones the dashboard's result counts.
  - **Next steps seen in play.** The misconceptions in their recent plays, as the strip counts them, in the game's words. This is the "next steps" half of a report card comment.
  - **Learning Skills.** Effort by skill, the same counts as the student page, marked "Reported separately from the math grade". In Ontario, Learning Skills never count toward a subject grade (*Growing Success*), so they're kept apart from the math evidence instead of sitting beside each expectation.
- **No band words, levels or ratings** appear, even though the dashboard shows bands. Bands beside a report card are the most likely thing to be read as a level, and the printout may go home. The intro says plays are evidence to weigh with the teacher's own observations, and that the grade is theirs.
- **API:** `GET /classes/{classId}/quick-assess` and `GET /classes/{classId}/students/{studentId}/quick-assess`, for the class's teacher only (404 otherwise). Achievement and next steps load through the dashboard's `countedRecords`. Effort loads grouped records (`effortFields` in `scoring.ts` explains why the grouping gives the same effort), so both stay light on a full term's history.
- **Teacher app:** `/teach/classes/<id>/quick-assess` comes from a "Quick assess" button next to "Manage class" on the dashboard. `/teach/classes/<id>/students/<id>/quick-assess` comes from a "Quick assess" section on the student page. Each screen has a back link and a Print button, and the page title names the class or student and the date, so "Save as PDF" names the file sensibly.
- **Print:** the app header, back link and Print button are hidden. The header line ("Quick assess · Room 12 · October 29, 2026") repeats on every page, via a one-column layout table's `<thead>`. A student stays on one page where they fit, and a line never splits. Everything prints in plain ink at a tighter size: about three students a page, so roughly 8 pages for a class of 24.
- **Tests:** API 231 (8 for quick assess), teach 137 (2 contract tests against both the fake and the API, and 3 rendered-app tests). Type checks and Biome are clean. In headless Chrome at 1366 and 360 px there's no page overflow, and print-media PDFs of the sample class (3 pages) and of one student looked right.
- **The founder needs to:** check print preview of a class and a student by hand (still open below). Nothing to install. Turbo regenerates `openapi.json` and the client, and `@repo/api-client` exports `getQuickAssess` and `getStudentQuickAssess`.
- **Expectation wording and links (founder-approved):** the 9 product-layer descriptions were rewritten to describe each whole expectation in plain words (`.scratch/mvp-platform/expectation-wording.md`). Each code now links to its official page on the DCP, in a new tab, on the dashboard, a cell's evidence and quick assess. It doesn't on the student page's results, which are already links to the evidence. Printed, the code is plain ink. The import records the links (`import-dcp.ts`, from one fresh fetch), and `add-curriculum`, `design-game` and the curriculum README now require a link for every entry.
- **Worth asking pilot teachers:** whether "N of M tasks on their own" is the right evidence to write from, and whether the next steps read well enough to go home.
