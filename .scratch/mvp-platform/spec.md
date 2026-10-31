# MVP platform: games and the teacher dashboard, without the class world

Status: ready-for-agent

## Problem Statement

Kindling's MVP was designed around a shared 3D class world: a hub with portals, a house for every student, invites and visits, multiplayer presence. That world is most of the build, and none of it is what makes a teacher say "I want this for my class". What does that is games where the concept is the mechanic, and evidence a teacher can act on and use for report cards.

Today nothing outside the games is real. The play shell runs on stand-ins: a pretend student picked on a fake sign-in screen, play records kept in memory and logged to the console, and a "back to the hub" link to a PlayCanvas prototype. There's no sign-in, no class, no stored result, no teacher view and no quick assess. The marketing site sells the 3D world, houses and visits to the teachers it's recruiting for the pilot.

The founder has re-scoped the MVP: five games across the Number strand, real sign-in for students and teachers, classes, and a teacher dashboard with drill-down and quick assess. The world comes later.

## Solution

Kindling ships as five games plus the platform around them, with no class world.

- **Students** sign in with Google through a **class join link** or a **game link** (which joins them to its class). They land in their **home**, a 2D screen with their **avatar** and wardrobe, their **locker** and the class's games. Every game returns them home, with any new **rewards** revealed. The locker opens from home: students decorate its door, outside and in, with **stickers**, and its inside holds a **keepsake** for each game they've played. Rewards are outfit pieces and stickers, earned from **effort** up to a weekly cap. **Recognition** is an exclusive sticker a teacher awards for a character trait.
- **Teachers** sign in with Google at the teacher app, create a class (choosing its grade or grades), and share links. Every game starts turned on. Every new teacher also gets a **demo class** of simulated students with results already in, deletable in one step. A three-step **welcome walkthrough** shows sharing a game link, spotting misconceptions, and viewing **quick assess**.
- **The dashboard** opens on the class by expectation: students against curriculum expectations, with the misconceptions showing up in the class above it. A teacher drills from a cell into that student's evidence for that expectation, then into individual plays. A student's page shows effort by Learning Skill, recognition and their own quick assess.
- **Quick assess** is a screen, optimised for printing, that states which expectations and Learning Skills each piece of evidence contributes to and never assigns a level or rating.
- **The world goes.** The world prototype is deleted behind a tag, the world's API becomes Kindling's core API, and the marketing site stops promising the world (with one "coming next" line).

The five games are fractions (Fraction Hop, built), multiplication (the lab winner), place value and whole numbers, addition and subtraction, and division, all Grades 3–5. Each goes through `design-game` and `build-game` on its own; this spec is the platform they plug into. The pilot starts when all five are accepted.

## User Stories

### Student: getting in

1. As a student, I want to join my class by opening the class join link my teacher shared and signing in with my school Google account, so that I'm in my class in one step.
2. As a student, I want opening a game link from my teacher to sign me in, join me to that class if I'm not in it yet, and open the game, so that the first link my teacher shares just works.
3. As a student who's already signed in, I want a game link to open the game straight away, so that I don't sign in again.
4. As a student in a split-grade class, I want to tap my grade once when I join, so that I play at my grade without waiting for my teacher.
5. As a student in a single-grade class, I want my grade set for me, so that I'm never asked.
6. As a student signing in for the first time, I want to design my avatar before anything else, so that the avatar I play with is mine.
7. As a student whose session has ended, I want to be sent to sign-in and then straight back to where I was going, so that I don't lose my place.
8. As a student, I want a clear "try again" when Kindling can't be reached, rather than being sent to sign-in, so that I'm not confused about whether I'm signed in.

### Student: home and the locker

9. As a student, I want to arrive in my home after joining or signing in, so that I always know where I am.
10. As a student, I want my home to show every game my teacher has turned on, so that I can pick one to play.
11. As a student, I want to come back home when a game ends, with any rewards I earned revealed there, so that finishing a game feels good.
12. As a student, I want to change my avatar's outfit from the outfit pieces I own, so that my character looks how I want in every game.
13. As a student, I want to place my stickers on the front and the inside of my locker's door and move them around, so that my locker is mine.
13a. As a student, I want my locker to hold something from each game I've played, so that it shows where I've been.
14. As a student, I want a recognition sticker from my teacher to look different from the stickers I earned, so that I know my teacher gave it to me.
15. As a student, I want to see what's new since I last looked, so that I notice rewards and recognition I haven't seen.
16. As a student, I never want to see a score, points or a grade for my play, so that the games feel like play, not a test.
17. As a Grade 3 student, I want home and the locker to work without reading, with every label also spoken, so that I can use it on my own.
18. As a student on an old Chromebook, I want home and the locker to load fast and respond to touch straight away, so that I get to games quickly.
19. As a student, I want my locker to be private, so that nobody else can see or change it.

### Student: rewards

20. As a student, I want rewards for trying again and getting better, not just for being right, so that struggling and improving is worth it.
21. As a student who plays at home, I want the same reward cap as everyone, so that it's fair to classmates without a device at home.
22. As a student who's reached this week's cap, I want to keep playing without being told I'm "out" of anything, so that playing never feels punished.
23. As a student whose game crashed, I want that play never to count against me, so that a bug isn't my fault.

### Teacher: getting in and setting up

24. As a teacher, I want to sign up and sign in with my school Google account, so that I don't need another password.
25. As a new teacher, I want a demo class with simulated students and results already in, so that I can see what Kindling shows before any student plays.
26. As a new teacher, I want a welcome walkthrough of no more than three steps (share a game link, spot misconceptions, view quick assess), so that I understand the key features in a minute.
27. As a teacher, I want to skip the walkthrough and bring it back later, so that it never gets in my way.
28. As a teacher, I want to delete the demo class in one step, so that it doesn't clutter my dashboard once I don't need it.
29. As a teacher, I want to explore the demo class as a student too, so that I know exactly what my students will see.
30. As a teacher, I want to create a class by giving it a name and its grade or grades, so that my students play at the right tier.
31. As a teacher, I want every game turned on in a new class, so that I can share any game straight away.
32. As a teacher, I want to turn a game off or back on for my class, so that students only see what fits.
33. As a teacher, I want to copy my class join link, so that I can post it in Google Classroom.
34. As a teacher, I want to copy a game link for any game in my class, so that I can drop it into Google Classroom when it fits my lesson.
35. As a teacher, I want to change a student's grade, so that I can fix a wrong pick in a split class.
36. As a teacher, I want to remove a student from my class, so that a student who joined by mistake doesn't show up in my results.
37. As a teacher with more than one class, I want to switch between my classes, so that I see one class at a time.
38. As a teacher, I want to see my students by real name (first name and last initial), so that I know who's who.

### Teacher: the dashboard

39. As a teacher, I want the dashboard to open on my class's students against curriculum expectations, so that I see the class at a glance, the way I report on it.
40. As a teacher, I want each cell to show how well that student's results show understanding of that expectation, so that I can see who's secure and who's stuck.
41. As a teacher, I want empty cells to read clearly as "no evidence yet", so that I don't mistake missing play for weak understanding.
42. As a teacher, I want the misconceptions showing up in my class listed above the grid with how many students show each one, so that I know what to reteach tomorrow.
43. As a teacher, I want to open a misconception and see which students showed it, so that I can group them.
44. As a teacher, I want each expectation described in plain words, so that I don't have to look codes up.
45. As a teacher, I want to open a cell and see that student's evidence for that expectation (which games, which tiers, which misconceptions, and how they did over time), so that I trust what the cell says.
46. As a teacher, I want to open a single play and see its tasks, attempts, retries and help used, so that I can see exactly what happened.
47. As a teacher, I want results earned at another tier to be clearly marked with it, so that evidence is honest about its level.
48. As a teacher, I want a student's page with their effort by Learning Skill, their recognition and their quick assess, so that I have everything about one student in one place.
49. As a teacher, I want effort evidence to show improvement after mistakes, not time spent or raw retries, so that it reflects Learning Skills fairly.
50. As a teacher, I want to see which students haven't been recognised yet this term, so that I recognise every student fairly.
51. As a teacher, I want to award a student recognition for a character trait in two taps, so that it takes no time.
52. As a teacher, I want results to appear soon after a student plays, even if their device was offline and sent them later, so that the dashboard is current.
53. As a teacher, I want results from home play to count the same as class play, so that I have all the evidence.

### Teacher: quick assess

54. As a teacher, I want to view quick assess for my class or for one student, so that I can write report cards from it.
55. As a teacher, I want quick assess to say which expectations and Learning Skills each piece of evidence contributes to, without assigning a level or rating, so that the judgement stays mine.
56. As a teacher, I want quick assess to print cleanly (no navigation, no cut-off rows, readable in black and white), so that I can print it or save it as a PDF from the browser.
57. As a teacher, I want quick assess to use Kindling's own descriptions of expectations, so that I can share it with parents.

### Founder and future work

58. As the founder, I want the demo class's data generated from the games' manifests, so that every new game appears in it with its own misconceptions.
59. As the founder, I want each class's results to remain accurate after a game or curriculum change, so that old evidence stays true.
60. As the founder, I want to change the effort, understanding and reward rules in one place without touching any game, so that I can tune them after the pilot.
61. As the founder, I want `pnpm dev` to start a local Postgres in Docker on a non-standard port, so that development needs no setup and doesn't clash with other databases.
62. As the founder, I want the world prototype kept behind a tag, so that I can come back to it without it costing anything now.
63. As the founder, I want the marketing site to describe what pilot teachers will actually get, with one line on what comes next, so that pilot teachers trust us.
64. As the founder, I want Kindling never to store a student's email, full surname or photo, so that our privacy promises hold.
65. As a parent, I want my child's data to stay minimal and their real name seen only by their teacher, so that I trust Kindling.

## Implementation Decisions

### Shape of the system

- **Core API.** `hubworld-api` is renamed `api` (and its client `api-client`). Multiplayer presence (the world store, event bus, WebSocket route and player schemas) is removed. The API keeps its pattern: Hono with `@hono/zod-openapi`, zod schemas, a generated OpenAPI document, and an orval-generated client.
- **Database package.** A new `packages/db` owns the Prisma schema, migrations and the generated Prisma client, on PostgreSQL. It's the only place schema changes are made. Its `dev` task starts a Postgres container in Docker on a non-standard host port (e.g. 55432) and applies migrations, so `pnpm dev` brings the database up with the rest. Read the installed Turborepo docs before wiring the task (see AGENTS.md).
- **Three front ends on one domain**, sharing one session cookie: the marketing site at `/`, the play shell (games, home and the locker) at `/play`, and a new **teacher app** `apps/teach` at `/teach` (Vite, React, Mantine through `@repo/ui`, like the play shell). The API is served under the same domain. Teacher code never ships in the play shell's bundle, which stays under the Chromebook budgets.
- **The world is removed**: `apps/hubworld` and the 3D export of `@repo/avatar` are deleted, after tagging the last commit that has them `world-poc`. The PlayCanvas skills stay installed for later.

### Identity and sessions

- Google sign-in (OpenID Connect) only. The API verifies Google's ID token server-side through an **identity verifier** it's given, so tests use a fake verifier. It stores Google's opaque subject ID, the first name and the last initial. It never stores the email, full surname or photo, and never logs them.
- The role comes from the entry point: signing in through the teacher app makes a **teacher**; signing in through a class join link or game link makes a **student**. One Google account is one role. A student account opening the teacher app gets a plain "this is for teachers" screen, and vice versa.
- The session is an HTTP-only, same-site cookie on the shared domain. Sign-in only redirects back to same-origin paths.
- `GET /session` keeps the shape the play shell's `SessionPort` already expects (stable opaque ID, grade, locale, avatar look, class). Signed out returns null, never a redirect.

### Classes, membership and links

- A **class** has a name, one teacher, one or more grades (3–5 for the MVP), a join code, and which games are on. Every game is on in a new class.
- A **membership** joins a student to a class and holds their grade in that class. Single-grade class: the grade is set on joining. Split-grade class: the student picks from the class's grades once on joining, and the teacher can change it.
- A **class join link** carries the join code and lands the student in their home. A **game link** is a game's link for one class (it carries the join code). Opening one joins the student to that class if they aren't in it, then opens the game, and its results go to that class.
- A student in several classes gets the games of all of them in their home, and each play records which class it was played for. That's the class whose link or game card on home opened it.
- The play shell's game link drops its portal parameter. `LinksPort.hub({ portal, play })` becomes a link home that reveals the rewards earned by `play`.

### Results, effort and rewards

- Unchanged from ADR 0002: games emit attempts, and the API computes results. `POST /play-records` keeps the contract in the play shell's platform README: idempotent by record ID, ordered within a play, batches of at most 25, late arrival trusted by device time, `crashed` never counting against effort, and validation against the game's manifest at that version.
- Results, understanding and effort are computed in one **scoring** module in the API from stored attempts, so rules change without touching games or stored records. Every result keeps its tier, game version and expectation edition.
- **Provisional rules**, until the open questions in DESIGN.md are settled (the pilot's data decides them; keep each one a single, named rule):
  - Understanding for one expectation is based on the share of that expectation's tasks the student ended up succeeding at **without help**, over their recent plays at that tier. It's shown as one of three descriptive bands ("not yet showing", "developing", "showing consistently"), plus "no evidence yet". It's never a percentage framed as a mark and never an achievement level.
  - Effort counts **improvement after a mistake**: a task with a failed attempt that's later succeeded on (the same task ID across retries), plus finished plays. It isn't raw attempts, time spent or retries alone. A `crashed` play contributes nothing for or against.
  - Rewards are granted from effort, up to a weekly cap kept as configuration. Its size is an open question. Reaching the cap is never shown to the student as a limit.
  - The recognition traits and the term dates (for "not yet recognised this term") are configuration. The provisional traits are kindness, perseverance and leadership, and the provisional terms are September–January and February–June.
- **Rewards are items from a catalogue**: outfit pieces (which map onto the avatar look the play shell already passes to games) and stickers. Recognition is one exclusive sticker per trait, and it doesn't count toward the cap. Grants are never random. The art uses named placeholder slots until the illustrator's style kit replaces them.
- **Locker state**: owned items, the outfit worn, sticker placements (on the front or the inside of the locker's door, with a tilt set when placed), keepsakes, and what's new since the student last looked.
- **Keepsakes** are one fixed object per game a student has played, inside the locker. They're not rewards: they never reflect how well the student did, and don't count toward the cap. A new keepsake, or a sticker not yet placed, makes the small locker on home glow; a new keepsake gets its own moment when the door opens.

### Teacher app

- **Dashboard landing view:** a grid of the class's students against the expectations the class's games evidence at the class's grades, with each cell showing an understanding band. A **misconception strip** above it lists the misconceptions revealed in the class's recent plays, ordered by how many students showed each.
- **Drill-down:** a cell opens that student's evidence for that expectation (games, tiers, misconceptions, change over time). A play opens its attempts in order. A row opens the **student page**, which shows effort by Learning Skill (from the curriculum package's Learning Skills), recognition and their quick assess.
- **Quick assess** is a dashboard screen for a class or a student. It's built from the curriculum package's product layer only (ADR 0001), and it has a print stylesheet: no navigation, no row split across pages, legible in greyscale, with page headers naming the class or student and the date.
- **Welcome walkthrough**: three steps on the demo class (share a game link, the misconception strip, quick assess). It's shown once per teacher, skippable, and can be replayed from help.
- **Demo class**: created at a teacher's first sign-in, with about 24 simulated students across Grades 3–5 and results generated deterministically from each game's manifest, including clear misconception patterns. "View as a student" opens home as one demo student. Deleting it removes it and everything in it in one step.

### Front-end seams

- The play shell keeps its platform ports (`SessionPort`, `PlayRecordsPort`, `LinksPort`) and adds a **locker port** for owned items, outfit, sticker placements and new-reward reveals. Real adapters wrap the generated API client, and stand-ins stay for API-less local development, chosen by an environment variable.
- The teacher app talks to the API only through a **teacher port** (classes, links, grades, games on or off, dashboard grid, misconception strip, drill-down, student page, recognition, quick assess, demo class, walkthrough state), with an in-memory fake and a real adapter.

### Docs and marketing

- `docs/DESIGN.md` is updated to match: the MVP list, the new principle 3 ("Teachers have no time"), principle 7 reworded to "Games stand alone", the student and teacher loops, the open questions, and the "relationship to existing code" section.
- The marketing site drops the class world, houses, visits, portals and the parent view from its claims, and leads with the games, misconceptions and quick assess. Students get their home, a locker to decorate, outfits and stickers. The comparison table's world row is replaced. One "coming next" line mentions the class world and the parent view. The placeholder world renders become home, locker and dashboard images.

## Testing Decisions

- **Good tests check behaviour someone outside could observe**: a request and its response, or what a user sees and does. They don't reach into stores, Prisma calls or component internals, so implementations can change underneath them.
- **API: integration tests against a real Postgres.**
  - Vitest's global setup starts one ephemeral PostgreSQL container with `@testcontainers/postgresql` and applies the `db` package's migrations. Tests isolate their data (truncate between tests, or a schema per worker).
  - Requests go through `testClient` from `hono/testing`, so the app's route types must stay inferable (routes chained on the app).
  - Google is replaced by the fake identity verifier.
  - Everything server-side is tested this way: sign-in and session, joining through each kind of link, grades, games on and off, play-record ingestion (idempotency, ordering, late batches, manifest validation, 4xx versus retryable failures), results, effort, rewards and the cap, recognition, the demo class, the dashboard and drill-down data, and quick assess data.
  - The scoring rules are tested by posting play records and reading results back, not as a unit.
  - The API's tests move from `node --test` to Vitest. The sandbox has a Docker daemon, so these run in the scratch copy.
- **Front ends: the rendered app against fake ports**, following the play shell's existing end-to-end test that renders the shell over stand-ins and asserts what a student can do and which records come out.
  - Home, the locker and the reveal are tested this way in the play shell.
  - The teacher app's flows are tested the same way over the in-memory teacher port: walkthrough, class creation, links, grid, drill-down, recognition, quick assess and deleting the demo class.
- **Contract suites tie the two seams together.** The existing platform contract suites run against the stand-ins today. New suites for the locker port and the teacher port are added, and every suite also runs against the real adapters wired to the in-process API (over the test Postgres), so fakes can't drift from the API.
- The print stylesheet is checked by hand (print preview of a class and a student quick assess) before the pilot. It's not unit tested.
- **Prior art**:
  - the play shell's `App.test.tsx`;
  - `platform/contract.ts` with `stand-ins/stand-ins.test.ts`;
  - the world API's `world.test.ts`, for testing behind async store interfaces;
  - `@repo/game-kit`'s fake shell.

## Out of Scope

- The class world in every form: hub, portals, presence, houses, furniture, invites, visits, preset phrases and emotes.
- Nicknames and the teacher's re-roll. The concept stays in the glossary for later.
- Teachers viewing a student's locker.
- The parent view.
- Microsoft or any non-Google sign-in, and students playing without signing in.
- Generated PDFs. Quick assess prints from the browser.
- Designing and building the five games. Each goes through `design-game` and `build-game`; this spec only requires that the platform hosts any game that meets the game contract.
- Adaptive tiers, per-student game overrides, paid tiers, licensing and board admin tools.
- Canadian hosting, data deletion requests and board privacy review, which run as a parallel track. The schema shouldn't make deletion hard (student data hangs off the student).
- Final effort weighting, reward cap size, the recognition trait list and term dates. They ship as configuration with the provisional values above.

## Further Notes

- **Pilot gate:** the pilot starts only when all five games are accepted. The founder chose a complete strand for the first impression over earlier feedback.
- **Principles this spec answers to**, from the updated DESIGN.md: "Teachers have no time" (#3, defaults over questions, one glance per screen), "Kindling provides evidence; the teacher makes the judgement", "Fair whatever is happening at home" and "Safe by default".
- **Sandbox:** following AGENTS.md, edit in the repo and run tests, type checks and Biome in a scratch copy. Never run `pnpm install` in the repo; the founder runs it on the host when dependencies change (Prisma, testcontainers and the new app all add dependencies).
- **The understanding bands are the riskiest wording in the product.** Principle 4 (evidence, not judgement) rules out anything that reads as a level. Review the band labels and colours with a teacher before the pilot.
