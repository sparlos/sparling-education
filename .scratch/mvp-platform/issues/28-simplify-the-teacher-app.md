# 28: Simplify the teacher app

**What to build:** Fewer buttons, fewer screens and less text across `/teach/`, so a teacher who's running a real classroom at the same time gets where they're going faster. Every button or link is something competing for their attention, so a control only stays if it's the one thing worth doing in that place (DESIGN.md principle 3). This ticket comes from an audit of every screen in headless Chrome. On the demo class (24 students) at 1366×768, the dashboard is 5,351 px tall, the grid starts at 901 px (below the first screen), and each grid row is about 150 px tall. About 48 Recognise buttons appear on the one page.

**Blocked by:** none

**Status:** ready-for-agent

### Dashboard (`Dashboard.tsx`, `Recognition.tsx`, `Demo.tsx`)

- [ ] Grid rows show the student's name (linked to their page) and, in a split class, their grade. That's all: no Recognise button and no "Recognised: …" line in the row. A row is about one line tall (48 px targets still apply)
- [ ] Recognising stays in "Not recognised yet this term" and on the student page, so the dashboard has only one Recognise per student, and only for students not yet recognised
- [ ] Expectation column headers are short: "Gr 4 · B1.6" and a short label of a few words, not the full description. The full description is on the student page. The link to the official ministry wording leaves the header (it stays on the student page) so a stray tap doesn't open a new tab mid-lesson
- [ ] The student name column stays in place while the grid scrolls sideways, so a class with every game's expectations still reads row by row
- [ ] The misconception strip shows the 3 most common, then an "All N misconceptions" toggle. Each item is one compact line. The game name is shown only when the class has more than one game
- [ ] The demo class card becomes a one-line banner: "Demo class: simulated students, with results already in." plus "View as a student" and "Delete" (delete still confirms)
- [ ] On the demo class at 1366×768, the grid's first rows are visible without scrolling

### Getting around (`routes.tsx`, `Classes.tsx`)

- [ ] `/teach/` opens the last class the teacher opened (remembering it in the browser is fine), or their only class. With no classes, it shows the new-class form
- [ ] The class switcher at the top of the dashboard is the one way between classes, with "New class" at its end. The "Your classes" back link and the classes screen go
- [ ] A **Share** button in the dashboard's header opens the class join link and the game links, each with its copy button, and each game's on/off switch beside its link. It replaces the links on the classes screen, and the games section of Manage. The demo class has no Share (it has no real links), as today
- [ ] The dashboard's header has three actions: Share, Quick assess, Manage class

### Student, evidence and play (`StudentScreen.tsx`, `Evidence.tsx`, `PlayScreen.tsx`, `QuickAssess.tsx`)

- [ ] The student page is the student's quick assess: math by expectation, next steps seen in play, then Learning Skills (reported separately), with a Print button and the same print stylesheet. Recognition stays on it, for screen only. The separate student quick-assess screen and its route go, and so does the "Quick assess" section that only linked to it
- [ ] A dashboard cell (or a student under a misconception) opens the student page with that expectation open, showing its bands and its plays, newest first. The separate evidence screen goes. Its old URL still works by opening the student page with that expectation open, so shared links don't break
- [ ] A play's back link goes to its student's page, with the play's expectation open
- [ ] Back links read the same everywhere: the class name to the dashboard, the student's name to their page
- [ ] Learning Skills leave out evidence with a count of zero ("0 tasks got right after a mistake")

### Manage (`Manage.tsx`)

- [ ] Manage is about students only (games moved to Share)
- [ ] Each student row has one "⋯" menu (Change grade, Remove from class) instead of two buttons. The grade explanation is said once, where the grade is picked

### Text

- [ ] Cut helper text that doesn't change what the teacher does: the effort explanation on the student page, the game links blurb, the long on/off switch descriptions. Keep the text that stops a wrong reading: "No evidence yet", the "never a level" note on quick assess, and the remove confirmation

### Tests and checks

- [ ] Rendered-app tests (`App.test.tsx`) updated for every change above. Add tests for: `/teach/` opening the last-used class; Share copying links and switching a game; the old evidence URL opening the student page at that expectation; the dashboard having no Recognise button for a student already recognised this term
- [ ] Headless Chrome at 1366×768 and 360×640 on the demo class: the grid starts on the first screen at 1366, rows are about one line, targets are 48 px or more. Report the dashboard's height and its count of buttons and links, before and after

## Notes

- DESIGN.md's teacher tools still hold: a cell still drills into that student's evidence for that expectation, then into individual plays; it just opens in the student page instead of its own screen. Update DESIGN.md's wording where it names screens that go (the classes screen, the separate evidence screen, the student's quick assess).
- Do this before the welcome walkthrough (18). Its three steps point at the game link (now in Share), the misconception strip and quick assess.
- Audit screenshots (before) were taken at 1366×768 and 360×640 on the fake platform, with Room 12 (6 students) and the demo class (24).
