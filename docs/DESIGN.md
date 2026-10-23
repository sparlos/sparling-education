# Kindling design

What Kindling is, the principles that settle disagreements about it, and what the MVP contains. Terms in **bold** are defined in [GLOSSARY.md](./GLOSSARY.md).

## What Kindling is

Kindling is a web-based learning game for Ontario classrooms, Grades 1–8. It has two parts:

- **Games**, where the concept being taught is the core mechanic. In the fractions game you cut planks to exact lengths to finish a bridge; when the wrong idea fails, you can see why. Games are the heart of Kindling.
- A **class world** that ties the games together: a **hub** with **portals** into games, and a **house** for every student, decorated with **rewards** earned through effort and shown off to classmates on **visits**.

Kindling is a **supplemental resource**. A teacher teaches the concept, turns on the games that reinforce it, and uses the **results** as assessment evidence at the end of term. It doesn't own the unit, set deadlines or expect to replace instruction. For students it's a reward activity; for teachers it's that, plus evidence for report cards.

Free for teachers. Students and parents never pay.

## Guiding principles

Ranked: when two conflict, the higher one wins.

1. **The mechanic is the lesson.** Getting better at the game has to mean getting better at the concept. No quiz questions in front of a game.
2. **Supplemental, not a replacement.** Kindling reinforces and evidences what the teacher teaches. No deadlines, no due dates, no assumption it owns the unit.
3. **Kindling provides evidence; the teacher makes the judgement.** Results say what they contribute to (curriculum expectations, Learning Skills) but never assign a level or a rating.
4. **Rewards follow effort, never money or luck.** No store, ads, loot boxes or upsells. Rewards measure effort; results measure understanding; students never see a score.
5. **Fair whatever is happening at home.** Home play is never an advantage. No streaks, daily rewards or limited-time items.
6. **Safe by default.** Minimal student data, real names seen only by responsible adults, and students never type free text other students can see.
7. **Games stand alone; the world ties them together.** Every game works from a link, without loading the class world.
8. **Runs on the classroom's worst Chromebook.** A requirement from day one, not an optimisation pass.

## Core concepts

### Students and identity

- Students and teachers sign in with Google. From a student's Google account Kindling keeps only their **real name** (first name and last initial), never their email or full surname.
- Each student has a **nickname** built from curated word lists ("Cosmic Otter"). A teacher can re-roll it.
- The real name is shown only to the student's teacher (and later, parent). Classmates and anything in the class world only ever see the nickname.
- In the class world students communicate only through preset phrases and emotes.

### Getting in

- A **class join link** carries the class's join code; one click (plus Google sign-in) puts a student in the class.
- A **game link** opens one game directly. Teachers drop these into Google Classroom. A signed-out student lands on sign-in, then is redirected to the game. Results from a game link count exactly as if the game were opened from a portal.
- The class world is one way into games, never the only way. A game opened by link never loads the class world, which also gives slow devices a lighter path.

### Games, tiers and results

- A **game** teaches one concept across a range of grades, split into **tiers**: one grade's worth of content each.
- A teacher sets each student's grade (which handles split-grade classes) and turns games on or off for the class. Only games that are on appear as portals.
- A student plays the tier for their grade.
- Every play produces a **result** recording:
  - the tier it was played at,
  - **understanding**: how well the student grasped the concept at that tier, which is evidence of curriculum achievement,
  - **effort**: retrying, improving after mistakes, persisting, which is evidence of Learning Skills and Work Habits.
- Effort must reward *improvement after a retry*, not raw retries, so it can't be gamed by spamming attempts.

**Design intent (beyond MVP): adaptive tiers.** A student starts at their grade's tier and moves up or down based on their results, within bounds the teacher can see. Because every result records its tier, assessment evidence stays honest about the level it was earned at. MVP ships fixed grade tiers so the move can be designed against real pilot data.

### Rewards and recognition

- **Rewards** (outfit pieces and furniture) come only from effort, never from understanding, money or chance. A struggling student who keeps at it earns as much as one who aces it.
- Rewards can be earned anywhere, up to a **weekly cap** a typical student reaches in class time alone. Home play still produces results teachers can see; it just can't buy an advantage, and there's no reason to log in daily.
- **Recognition** is a separate kind of item that only a teacher can award, for a small fixed set of character traits (kindness, perseverance, leadership…). It doesn't count toward the cap. The teacher view highlights students who haven't been recognised yet this term.

### Houses and visits

- Every student has their own **house**, a separate space reached from the hub. Only the owner can change it. The hub itself is designed by Kindling and isn't decorated by students.
- A student can enter a house that isn't theirs only on an **invite**:
  1. The owner must be home; an invite is only valid while they are.
  2. An invite lasts for one visit. When the owner leaves or ends it, visitors go back to the hub. There are no standing invites.
  3. The owner can remove a visitor at any time.
  4. Visitors can look, emote and use preset phrases, but can't touch anything.
  5. Invites only go to classmates.
  6. The teacher can view any house at any time, without an invite.

### Teacher tools

- Create a class, share the class join link and game links, set student grades, turn games on and off, re-roll nicknames.
- See results by curriculum expectation, effort evidence by Learning Skill, and who hasn't been recognised yet.
- **Quick assess**: a printable PDF, generated in the browser, summarising a student's or a class's results for report-card writing. It states which expectations and Learning Skills each piece of evidence contributes to, and leaves the level and rating for the teacher.

## Student loop

Join the class → design an avatar → arrive in the hub → jump through a portal (or open a game link) → play the tier for your grade → earn rewards from effort → decorate your house → invite classmates over.

## Teacher loop

Teach the concept → turn on the games that reinforce it (or drop a game link) → watch results come in → recognise students for character traits → at end of term, export quick assess and write report cards.

## MVP

The MVP is a **demo-ready product built on pilot-ready foundations**. It has to make a prospective teacher say "I want this for my class" in a live demo, a video or their own walkthrough, and it has to become a real classroom pilot without a rewrite. Sign-in, data model and hosting choices are the real ones; only the **demo class** (a sandbox class with simulated classmates, explorable as teacher and as student) is demo-specific. Privacy work for board review (Canadian hosting, deletion) runs alongside instead of blocking.

### In

- Google sign-in for students and teachers, the sign-in redirect, game links and class join links
- Nicknames from word lists; real names kept as first name and last initial only
- Teacher creates a class, sets student grades, turns games on and off
- Two games in one math strand, each with 2–3 tiers, recording results with understanding, effort and tier
- Hub with portals, avatar customisation, multiplayer presence
- Houses with furniture placement, invites and visits under the six rules
- Rewards from effort with a weekly cap
- Teacher recognition
- Teacher view: results by expectation, effort evidence, recognition gaps, viewing any house
- Quick assess PDF export
- Preset phrases and emotes
- Demo class with simulated classmates
- Runs acceptably on an older Chromebook

### Out (later)

- Parent view
- Adaptive tiers (see design intent above)
- Per-student game overrides
- Paid tier, licensing and board admin tools
- A lighter mode for slow devices (game links are the lighter path for now)
- Students playing without signing in

## Open questions

- Which concept is the second MVP game, alongside fractions? It should be in the same strand and show off a different mechanic.
- Which grade range do the MVP tiers cover?
- How large is the weekly reward cap, and what does "a typical student in class time" mean in numbers?
- What is the fixed set of recognition traits?
- What exactly counts as effort, and how is it weighted?

## Relationship to the existing code

- `apps/hubworld` is the class world prototype. Its item placement currently happens on the shared hub island; under this design it moves into houses, and the hub becomes undecorated by students.
- `apps/hubworld-api` serves multiplayer presence for one world.
- No game exists yet. The first fractions game is the highest-priority build.
