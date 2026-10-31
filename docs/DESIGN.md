# Kindling design

What Kindling is, the principles that settle disagreements about it, and what the MVP contains. Terms in **bold** are defined in [GLOSSARY.md](./GLOSSARY.md).

## What Kindling is

Kindling is a web-based learning game for Ontario classrooms, Grades 1–8. It has three parts:

- **Games**, where the concept being taught is the core mechanic. In Fraction Hop you plan a route of fraction hops along a number line, then watch your avatar run it; when the wrong idea fails, the splash shows exactly which hop was wrong. Games are the heart of Kindling.
- A student's **locker**: their own 2D home screen, with their **avatar**, wardrobe, **stickers** and the games their teacher has turned on. Every game returns there, with any new **rewards** revealed.
- A teacher's **dashboard**: the class's **results** by curriculum expectation, the **misconceptions** showing up in the class, and **quick assess** for report cards.

A shared 3D **class world** (a **hub** with **portals** into games, and a **house** for every student) is the design intent for later, not the MVP ([ADR 0003](./adr/0003-mvp-ships-without-the-class-world.md)).

Kindling is a **supplemental resource**. A teacher teaches the concept, shares the games that reinforce it, and uses the results as assessment evidence at the end of term. It doesn't own the unit, set deadlines or expect to replace instruction. For students it's a reward activity; for teachers it's that, plus evidence for report cards.

The tagline says that in four words: _Where play becomes proof._ It's Kindling's line across the site, videos and anything else that speaks for the whole platform.

Free for teachers. Students and parents never pay.

## Guiding principles

Ranked: when two conflict, the higher one wins.

1. **The mechanic is the lesson.** Getting better at the game has to mean getting better at the concept. No quiz questions in front of a game.
2. **Supplemental, not a replacement.** Kindling reinforces and evidences what the teacher teaches. No deadlines, no due dates, no assumption it owns the unit.
3. **Teachers have no time.** Every teacher task takes the fewest steps possible, and every screen makes sense at a glance without training. Kindling picks sensible defaults rather than asking, and shows the one thing worth acting on before the detail behind it.
4. **Kindling provides evidence; the teacher makes the judgement.** Results say what they contribute to (curriculum expectations, Learning Skills) but never assign a level or a rating.
5. **Rewards follow effort, never money or luck.** No store, ads, loot boxes or upsells. Rewards measure effort; results measure understanding; students never see a score.
6. **Fair whatever is happening at home.** Home play is never an advantage. No streaks, daily rewards or limited-time items.
7. **Safe by default.** Minimal student data, real names seen only by responsible adults, and students never type free text other students can see.
8. **Games stand alone.** Every game works from a link. The locker, and later the class world, are ways into games, never requirements for them.
9. **Runs on the classroom's worst Chromebook.** A requirement from day one, not an optimisation pass.

## Core concepts

### Students and identity

- Students and teachers sign in with Google. From a student's Google account Kindling keeps only their **real name** (first name and last initial), never their email, full surname or photo.
- The real name is shown only to the student's teacher (and later, parent).
- The role comes from the way in: signing in through the teacher app makes a teacher; signing in through a class join link or game link makes a student. One Google account has one role.
- A student designs their avatar before anything else, the first time they sign in. It's the same avatar in the locker and in every game.

### Getting in

- A **class join link** carries the class's join code; one click (plus Google sign-in) puts a student in the class and lands them in their locker.
- A **game link** opens one game for one class. Teachers drop these into Google Classroom. Opening one joins the student to that class if they aren't in it yet, then opens the game. A signed-out student lands on sign-in, then goes straight to the game. Results from a game link count exactly as if the game were opened from the locker.
- A student in several classes sees the games of all of them in their locker, and each play counts for the class whose link or locker entry opened it.

### Games, tiers and results

- A **game** teaches one concept across a range of grades, split into **tiers**: one grade's worth of content each.
- A student's grade comes from their class. In a single-grade class it's set on joining; in a split-grade class the student taps their grade once on joining, and the teacher can change it.
- Every game is turned on in a new class. A teacher can turn a game off or back on, and only games that are on appear in the locker.
- A student plays the tier for their grade.
- Every play produces a **result** recording:
  - the tier it was played at,
  - **understanding**: how well the student grasped the concept at that tier, which is evidence of curriculum achievement,
  - **effort**: retrying, improving after mistakes, persisting, which is evidence of Learning Skills and Work Habits.
- Effort must reward *improvement after a retry*, not raw retries, so it can't be gamed by spamming attempts.

**Design intent (beyond MVP): adaptive tiers.** A student starts at their grade's tier and moves up or down based on their results, within bounds the teacher can see. Because every result records its tier, assessment evidence stays honest about the level it was earned at. MVP ships fixed grade tiers so the move can be designed against real pilot data.

### The locker

- The locker is a student's own home screen: their avatar and wardrobe, their stickers, and the games their teacher has turned on.
- Every game returns the student to their locker, with any rewards earned in that play revealed there. The locker also shows what's new since the student last looked.
- Only the student sees or changes their locker. Nobody visits it, and in the MVP teachers don't view it.
- A Grade 3 student can use it without reading: every label is also spoken.

### Rewards and recognition

- **Rewards** (outfit pieces and stickers) come only from effort, never from understanding, money or chance. A struggling student who keeps at it earns as much as one who aces it.
- Outfit pieces change how the avatar looks everywhere; stickers are placed on the locker and moved around.
- Rewards can be earned anywhere, up to a **weekly cap** a typical student reaches in class time alone. Home play still produces results teachers can see; it just can't buy an advantage, and there's no reason to log in daily. Reaching the cap is never shown to the student as a limit.
- **Recognition** is an exclusive sticker, one design per character trait, that only a teacher can award (kindness, perseverance, leadership…). It stands out from earned stickers and doesn't count toward the cap. The dashboard highlights students who haven't been recognised yet this term.

### Teacher tools

- Sign in with Google, create a class with its name and grade or grades. `/teach/` opens the class the teacher last had open; the class switcher (with "New class" at its end) is the one way between classes. **Share** on the dashboard has the class join link and the game links to copy, with each game's on/off switch beside its link. **Manage class** is about the class's students (change a student's grade, remove a student), plus its **class colour**, which is also picked when the class is made.
- **The dashboard** opens on the class by expectation: students against the curriculum expectations the class's games evidence, each cell describing that student's understanding (or "no evidence yet"), with the misconceptions showing up in the class listed above it. A cell drills into that student's page with that expectation open, showing its bands and plays, newest first, then into individual plays. Rows and column headers stay short (the full description of an expectation is on the student's page), and recognising a student is done from the students not recognised yet this term, or the student's page. A student's page is their quick assess, with recognition on screen only.
- **Quick assess**: the class's screen, and each student's own page, summarising results for report-card writing and optimised for printing from the browser. On screen, the class's screen goes through one student at a time, beside the class's names, which a search box filters. It states which expectations and Learning Skills each piece of evidence contributes to, and leaves the level and rating for the teacher.
- Every new teacher gets a **demo class** of simulated students with results already in, explorable as a student too, and deletable in one step. A **welcome walkthrough** on the teacher's first dashboard shows what Kindling does in a nutshell (share a game link, spot misconceptions, view quick assess, and the rest of what's on screen), and each other screen has a short walkthrough of its own the first time it's opened. Each is shown once, skippable at every step, and can be replayed from Help.

### Later: the class world

The design intent beyond the MVP, kept so it's built on the same foundations:

- A **hub** designed by Kindling, with **portals** into games and multiplayer presence. Students communicate only through preset phrases and emotes, and are known to classmates by a **nickname** built from curated word lists, which a teacher can re-roll.
- A **house** for every student, decorated with furniture earned as rewards. Only the owner can change it. A classmate enters only on an **invite**, which is valid only while the owner is home, lasts one **visit**, and only goes to classmates. Visitors can look, emote and use preset phrases but can't touch anything, and the owner can remove a visitor at any time. A teacher can view any house without an invite.
- The class world is one more way into games. Games and the locker never depend on it.

## How games are built

- **The contract.** A game is a workspace package under `games/` that exports a manifest and a React component through `@repo/game-contract`. The play shell (`apps/play`, on the same domain as the teacher app and the marketing site) owns sign-in, tier choice, loading, voice playback, the API and the trip back to the locker. A game only receives props and emits **attempts**; Kindling computes understanding and effort from them ([ADR 0002](./adr/0002-games-emit-attempts-platform-scores.md)).
- **Continuity.** One session across the locker and games. Leaving a game returns the student to their locker, with any rewards revealed on arrival. Shared tokens and transitions. Every game shows the **avatar**, at least as a reacting portrait drawn in 2D from the same avatar data the locker uses.
- **Touch first.** Pointer events, so touch, pen and mouse behave the same. React + SVG/DOM by default; PixiJS or PlayCanvas only when a game spec justifies it.
- **Words and voice.** Every string a student sees or hears is localised by ID (English now, ready for French). Every instruction is shown as text and has a voice line generated at build time, with browser speech as the fallback, so a game works in a loud classroom or with the volume off. For Grades 1–3, playing never requires reading, and no grade requires sound: demonstrations and visual feedback carry the meaning on their own.
- **Art.** Agents draw SVG within a 2D style kit an illustrator designs. Games refer to art by named slot, so a real asset replaces a slot without code changes.
- **Curriculum.** `@repo/curriculum` holds the official text for designing games and Kindling's own descriptions for the product ([ADR 0001](./adr/0001-two-layer-curriculum-package.md)).
- **Evidence over time.** Attempts record the game version, tier, and expectation with its curriculum edition. A change to what a tier evidences bumps the game version.
- **Testing.** Game rules (task generation, checking an attempt, detecting misconceptions) are plain TypeScript with unit tests. A harness plays each game through simulated touch against a fake shell.
- **Chromebook budgets.** Reference device: a 4 GB Celeron N4020 / MediaTek MT8183 Chromebook, approximated in CI with 4× CPU throttling and Fast 3G. Per game: at most 250 KB of gzipped JavaScript beyond the shell, at most 2 MB to start one tier (art and audio included), at least 30 fps while dragging (60 fps target), touch response within 100 ms. Touch targets at least 48 px, 64 px for Grades 1–2.
- **Skills.** `design-game` finds the fun with prototypes in the lab and produces an approved **game spec**; `build-game` builds it on the starter kit until the founder accepts it; `polish-game` is a second, visual pass; `review-game` checks a built game against these principles; `add-curriculum` imports a new subject. All were extracted from building Fraction Hop, and each ends with a retro (`docs/agents/skill-retro.md`).

## Student loop

Open the class join link (or a game link) and sign in with Google → design an avatar → tap your grade, if your class has more than one → arrive in your locker → pick a game (or open a game link) → play the tier for your grade → return to the locker with rewards from effort revealed → change your outfit and place your stickers.

## Teacher loop

Sign in with Google → explore the demo class in the welcome walkthrough → create a class and share its join link or a game link → teach the concept and drop in the game links that reinforce it → watch results come in and reteach the misconceptions showing up → recognise students for character traits → at end of term, open quick assess and write report cards.

## MVP

The MVP is a **demo-ready product built on pilot-ready foundations**. It has to make a prospective teacher say "I want this for my class" in a live demo, a video or their own walkthrough, and it has to become a real classroom pilot without a rewrite. Sign-in, data model and hosting choices are the real ones; only the **demo class** is demo-specific. Privacy work for board review (Canadian hosting, deletion) runs alongside instead of blocking.

The MVP is a complete strand of games and the teacher evidence around them, without the class world ([ADR 0003](./adr/0003-mvp-ships-without-the-class-world.md)). The pilot starts only when all five games are accepted.

### In

- Five games across the Number strand, Grades 3–5, each with a tier per grade, recording results with understanding, effort and tier: fractions (Fraction Hop), multiplication, place value and whole numbers, addition and subtraction, and division
- Google sign-in for students and teachers, the sign-in redirect, class join links and game links (which join their class)
- Real names kept as first name and last initial only
- Teacher creates a class with its grade or grades; every game starts on and can be turned off; grades come from the class, with a one-time pick in split-grade classes that the teacher can change
- Avatar design and the locker: wardrobe, stickers, the class's games, and rewards revealed on return from a game
- Rewards (outfit pieces and stickers) from effort with a weekly cap
- Teacher recognition, as an exclusive sticker per trait, and the not-yet-recognised list
- The teacher dashboard: the students-by-expectation grid, the misconception strip, drill-down from cell to evidence to play, and the student page with effort by Learning Skill
- Quick assess as a screen with a print stylesheet, for a class or a student
- The demo class, explorable as a teacher and as a student, deletable in one step
- The welcome walkthrough
- Runs acceptably on an older Chromebook

### Out (later)

- The class world: the hub, portals and multiplayer presence
- Houses, furniture, invites and visits
- Preset phrases and emotes
- Nicknames and the teacher's re-roll
- Teachers viewing a student's locker
- Parent view
- Generated PDFs (quick assess prints from the browser)
- Microsoft or any other non-Google sign-in
- Adaptive tiers (see design intent above)
- Per-student game overrides
- Paid tier, licensing and board admin tools
- Students playing without signing in

## Open questions

The pilot's data decides these. Until then each ships as one named, provisional rule in the API's scoring module or as configuration.

- How large is the weekly reward cap, and what does "a typical student in class time" mean in numbers?
- What is the fixed set of recognition traits? Provisionally kindness, perseverance and leadership.
- What exactly counts as effort, and how is it weighted? Provisionally, improvement after a mistake (a failed task later succeeded on) plus finished plays.
- What are the understanding bands, and how are they worded? Provisionally "not yet showing", "developing" and "showing consistently", from the share of an expectation's tasks the student ended up succeeding at without help. This is the riskiest wording in the product (principle 4 rules out anything that reads as a level), so the labels and colours are reviewed with a teacher before the pilot.

## Relationship to the existing code

- `apps/play` is the play shell. It hosts every game at its game link and runs on stand-ins for sign-in, play records and links today, behind its platform ports (`SessionPort`, `PlayRecordsPort`, `LinksPort`). It gains the locker, a locker port, and real adapters over the core API; `LinksPort.hub` becomes a link back to the locker.
- `games/fraction-hop` is the first game, built through `design-game` and `build-game`. `@repo/game-kit` holds the logic extracted from it for the next games.
- `apps/play/src/lab` is the dev-only prototype lab where `design-game` plays candidate mechanics before a game spec is written. The multiplication game's prototype is picked there.
- `apps/hubworld-api` becomes the core API, `apps/api` (with its client `packages/api-client`), with multiplayer presence removed. It computes results, effort and rewards in one scoring module.
- `packages/db` (new) owns the Prisma schema, migrations and client on PostgreSQL, and starts a local Postgres in Docker for `pnpm dev`.
- `apps/teach` (new) is the teacher app at `/teach`: the dashboard, quick assess, the demo class and the welcome walkthrough. Teacher code never ships in the play shell.
- `apps/web` is the marketing site at `/`. Its copy is rewritten to stop promising the class world.
- `apps/hubworld` (the class world prototype) and the 3D export of `@repo/avatar` are deleted; the last commit that has them is tagged `world-poc`.
- `packages/game-contract`, `packages/curriculum` (Math 2020, Grades 1–8), `packages/ui`, `packages/tokens`, `packages/avatar`, `packages/voice` and `packages/marketing` are shared by the apps and games.
