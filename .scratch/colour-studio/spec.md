# Colour Studio look, and class colours

Status: ready-for-agent

## Design reference

The approved designs are on a design canvas: https://claude.ai/artifact/1mP7QN7dtcVN2rGSjB99hG

- **"E · Teal"** (`project/StudioTeal.dc.html`): the teacher dashboard in the new look. This is the target.
- **"E · Student locker"** (`project/Locker.dc.html`): the locker in the new look. Set its **accent** tweak to `teal`.
- **"E · Colour Studio"** (`project/Studio.dc.html`) and **"E · Ember"** (`project/StudioEmber.dc.html`) show the same look in other hues, which is roughly what other class colours will look like.
- The other boards (A–D, F, "Today") are rejected directions. Use them only to see what to avoid.

The canvas is private to the founder. An agent with the Artifact tool reads a board with `action: "read"` and `path` set to the file above. Without it, ask the founder for screenshots. The boards are mockups with made-up students and curriculum codes, so take the look from them, not the copy. Copy and layout stay as the apps have them now.

Key values from the boards:

- Page `#F4F5FA` (cool grey). Cards white, radius 16 (20 in the locker), shadow `0 1px 2px rgba(27,29,51,.06), 0 8px 24px rgba(27,29,51,.06)`, no borders. Ink `#1B1D33`, muted ink `#4B4F6B` / `#60647E`, hairlines `#ECEEF5`, input borders `#D7DAE6`.
- Type: Plus Jakarta Sans, weights 500 to 800, for both headings and body.
- Teal: fill `#0E7C6B`, results from weakest to strongest `#E3F4EF` / `#7CCBB6` / `#0B5E51`.
- Section headings have a 36 px (44 px in the locker) rounded icon tile in a soft tint. Students have coloured initial circles. Counts and the grade show as pastel pills. The class switcher is a segmented control.

## Problem Statement

Teachers who tried Kindling said it looks drab and boring: beige pages, muted teal, and nothing that catches the eye. The student side is just as plain. A first try at "fun" (stickers, candy colours, neon) was too childish for teachers, who are professionals. The founder wants a look that is lively and colourful but still professional, used across the whole product.

A teacher with several classes also has nothing that tells their classes apart at a glance. Every class looks the same.

## Solution

Kindling moves to the "Colour Studio" look: cool grey pages, white cards with soft shadows, Plus Jakarta Sans, coloured icon tiles, pastel pills and initial circles, and a results grid that runs from light to dark in one colour. Teal is the brand colour.

Each class has a **class colour**, picked from a fixed set of 12 that Kindling provides. Everything about that class takes its hue: the teacher's dashboard, student pages, quick assess, share and manage screens; the class's section in each student's locker; and the play shell around a game opened for that class. The teacher picks a class colour when making a class, with a sensible one already chosen, and can change it later. Students never pick it.

Colours that carry meaning stay the same in every class. Misconception counts are always amber and recognition is always pink, so they never change meaning from class to class.

## User Stories

1. As a teacher, I want the dashboard to look bright and modern, so that Kindling feels like a tool I enjoy opening.
2. As a teacher, I want the new look to stay professional, so that I'm comfortable showing it to colleagues, my principal and parents.
3. As a teacher, I want each of my classes to have its own colour, so that I can tell at a glance which class I'm looking at.
4. As a teacher making a class, I want a class colour already picked for me, so that I don't have to make a decision to get started.
5. As a teacher making a class, I want the colour picked for me to differ from my other classes' colours, so that my classes look different without my doing anything.
6. As a teacher making a class, I want to choose a different colour if I like, so that the class feels like mine.
7. As a teacher, I want to see the 12 colours as swatches with a name on each, so that I can choose quickly and screen readers can announce them.
8. As a teacher, I want to change a class's colour later from Manage class, so that I can fix a choice I don't like.
9. As a teacher, I want the change to show straight away on every screen for that class, so that I can see what I chose.
10. As a teacher, I want each class in the class switcher to show its colour, so that I can find a class by colour as well as by name.
11. As a teacher, I want the class I'm in to be marked in its own colour in the switcher, so that I always know where I am.
12. As a teacher, I want the results grid to use the class colour from light (not yet showing) to dark (showing consistently), so that the grid reads like a heat map I can scan.
13. As a teacher, I want the three understanding bands to differ clearly in lightness in every class colour, so that I can tell them apart whatever colour I picked, and so can a colour-blind colleague.
14. As a teacher, I want "No evidence yet" to stay a dashed, uncoloured cell, so that a gap never looks like a result.
15. As a teacher, I want a key to the three bands above the grid, so that I know what each shade means.
16. As a teacher, I want misconception counts to look the same in every class, so that I learn what they look like once.
17. As a teacher, I want the "not recognised yet" list to look the same in every class, so that recognition stands out the same way everywhere.
18. As a teacher, I want each student to have a coloured circle with their initial, so that the names are easier to scan.
19. As a teacher, I want a student's circle to keep its colour on every screen, so that I start to recognise students by it.
20. As a teacher, I want the student page and quick assess to use the class colour, so that they clearly belong to that class.
21. As a teacher printing quick assess, I want the printout to read clearly on a black-and-white printer, so that the colour never hides the evidence.
22. As a teacher, I want the demo class in Kindling's teal, so that the first class I see looks like Kindling. (Changed by the founder on 2026-10-30; it was a colour of its own.)
23. As a teacher, I want screens outside any class (sign-in, making a new class) to use Kindling's teal, so that the app still has one brand.
24. As a teacher, I want the welcome walkthrough to keep working in the new look, so that its spotlight still lands on the right things.
25. As a teacher with existing classes, I want them to keep working after the change, with a colour given to each, so that nothing breaks.
26. As a teacher, I want all text to stay easy to read on every colour, so that no class colour leaves me squinting.
27. As a teacher, I want keyboard focus to stay visible in every class colour, so that I can use the app without a mouse.
28. As a student, I want my locker to look bright and friendly, so that I want to open it.
29. As a student, I want each of my classes in my locker to show in its class colour, so that I can tell which class's games are which.
30. As a student, I want big game cards with a picture on each, so that I can find my game without reading.
31. As a student, I want a big button to hear each line read aloud, beside every instruction and game card, so that I can use my locker without reading.
32. As a student, I want buttons to still react when I press them, so that I know my tap worked.
33. As a student, I want the screens around a game (loading, "Do you want to stop playing?", saving) to use that class's colour, so that they feel part of the same place.
34. As a student, I want my stickers and new rewards to look special, so that I'm excited to get them.
35. As a student in Grade 1 or 2, I want touch targets to stay big, so that I can tap them easily.
36. As a student on a slow Chromebook, I want the new look to load as fast as the old one, so that I'm not left waiting.
37. As a parent or a board visitor on the marketing site, I want it to match the app's new look, so that Kindling looks like one product.
38. As the founder, I want the class colours defined in one place in the tokens, so that I can add more (up to 16) or retune them later without touching the apps.
39. As the founder, I want a test to fail if any class colour breaks the contrast minimums, so that a new colour can't ship unreadable.
40. As the founder, I want the brand colour to be a single token, so that renaming or rebranding away from "Kindling" later is cheap.

## Implementation Decisions

### Tokens (`@repo/tokens`)

- Replace the warm "sand" surfaces with the Studio neutrals: cool grey page, white raised surfaces, a pale recessed surface, ink and muted ink as in the Design reference, and hairline and input border colours. Add a soft-shadow token for cards.
- The brand tone becomes teal. Ember stops being the brand colour. It may stay in the palette for game art, which uses palette values directly.
- Fonts: Plus Jakarta Sans for both the heading and body roles. Self-host it as woff2, with at most three weights (for example 500, 700 and 800), so the play shell stays inside the Chromebook budgets.
- New **class colours**: an ordered, named set of 12, each with a stable slug and a teacher-facing name, for example `teal` "Teal". Suggested hues, spread around the wheel: teal, green, lime, amber, orange, coral, rose, berry, violet, indigo, blue, sky. Pick the final hexes during implementation so they pass the tests.
- Each class colour gives a full tone (`fill`, `fillHover`, `onFill`, `edge`, `soft`, `text`) plus a three-step **results ramp**: weakest, middle, strongest, each with its own text colour. Light hues such as amber and lime use dark `onFill` text. The rest use white.
- The set is extensible to 16 without changes outside the tokens.
- The fixed meaning colours (misconception amber, recognition pink, success, info and focus) are separate tokens and never come from a class colour.
- A small fixed set of initial-circle tints, picked for each student by a stable hash of the student's id. They are the same on every screen, never chosen by anyone, and never a result colour.
- Audience tones (educator, parent, student) are re-derived from the new palette. Educator becomes the brand teal, so screens outside a class look as they did in the mock.

### UI library (`@repo/ui`)

- The theme publishes the new neutrals, fonts and shadows as the existing `--k-*` variables, keeping the existing names where the meaning is unchanged, so most CSS modules pick up the look without edits.
- New **class colour scope**: a component that takes a class colour slug and sets the accent tone and results-ramp CSS variables (for example `--k-accent-*` and `--k-result-*`) on its container. It also writes the slug as a data attribute, so tests can assert which colour is applied. Outside any scope, the accent falls back to the brand teal.
- Components that take a `tone` gain an `"accent"` tone that reads the scoped variables.
- Buttons: every app keeps the outlined buttons that lift and press, in the new colours (the founder's call, 2026-10-30, over flat Studio buttons). Buttons, menus, badges and tiles default to the class colour in scope, so back links and other subtle buttons follow it.
- New **colour picker** input: a radio group of named swatches (real radio inputs, with each colour's name as its label and a 44 px minimum target). It is used on the new-class form and on Manage class.
- Card and icon-tile styles match the reference: soft shadow, radius 16, icon tile with a soft tint.

### Data and API

- Schema change: `Class` gains `colour`, a string slug that always holds a valid slug from the class colour set. A migration gives existing classes `teal`. The demo class is teal (the founder's call, 2026-10-30), so a teacher's first class of their own gets green by the "first unused" rule.
- Creating a class accepts an optional colour. Without one, the API picks the first colour in the set's order that none of the teacher's other classes use. When all 12 are used, it cycles through them.
- New teacher operation: set a class's colour. It validates the slug against the token set, and only the class's own teacher can call it.
- The class colour slug is returned on every class the teacher app reads (`Class` in the teacher port), and on each locker `Membership` and game-link play in the play shell's ports.
- The API validates slugs against the class colour set from `@repo/tokens`, the one source of truth, and rejects unknown ones.

### Teacher app (`apps/teach`)

- Every screen inside a class (dashboard, student page, play, quick assess, share, manage) renders inside the class colour scope for that class's colour.
- The class switcher becomes a segmented control. Each class shows a dot in its own colour, and the current class is filled in its colour. "New class" stays at the end.
- The results grid's three understanding bands use the results ramp. "No evidence yet" stays a dashed, uncoloured cell. A key to the bands sits above the grid. Band words stay the same, so the grid still reads in greyscale.
- Misconceptions show as cards in a responsive grid with fixed amber count pills. "Not recognised yet" uses the fixed recognition pink.
- Students get initial circles.
- The new-class form gains the colour picker, with the default already selected: the same "first unused" rule the API applies, computed from the teacher's classes. Manage class gains a "Class colour" section with the same picker. This changes DESIGN.md's "Manage class is about students", so update that line.
- Quick assess print styles keep the colour light and put the meaning in words.

### Play shell (`apps/play`)

- Each class section in the locker renders inside the scope for its class's colour: icon tile, heading and game-card accents. The locker's own chrome (header, avatar badge, stickers) uses the brand teal and the fixed recognition pink.
- Game cards get the reference's large picture area. Each game names its locker art by named slot, like other game art. Until an illustrator supplies it, use a tinted placeholder. Fraction Hop can use simple fraction shapes.
- Shell chrome around a play (loading, leave dialog, saving) renders in the colour of the class the play counts for.
- Games themselves are unchanged and keep their own art.
- No new spoken strings: the class colour is never named to students, so `pnpm voice` isn't needed. If a spoken string changes anyway, tell the founder to run `pnpm voice`.

### Marketing site (`apps/web`)

- Picks up the new tokens and font automatically. Check its pages for anything the new neutrals or the teal brand break (contrast, warm-toned imagery against cool grey), and fix those. A redesign of its layouts is not part of this work.

### Glossary

- Add **Class colour** to `docs/GLOSSARY.md`: "The colour a teacher picks for a class, from a fixed set, which every screen for that class takes its hue from. Never shown to students as a choice." _Avoid_: theme, class theme, skin.

## Testing Decisions

- Good tests assert what a person sees and can do, through the highest existing seam. They never test CSS-module internals or variable plumbing. The data attribute on the class colour scope is the one observable hook for "which colour is applied", since jsdom can't compute styles.
- **`@repo/tokens` contrast test** (prior art: the existing contrast test). Extend it so that every class colour's tone meets the same AA checks as the existing tones. Every results-ramp step's text meets 4.5:1 on its step. The three ramp steps differ in relative luminance by a minimum margin, so they are told apart by lightness, not hue. Focus meets 3:1 on every surface and every fill. The set has 12 to 16 colours with unique slugs.
- **Teacher app rendered-app tests** (prior art: the teacher app's App.test.tsx over the fake port). Cover:
  - a new class has a colour selected by default, and it differs from the teacher's existing classes
  - picking another colour and creating the class shows the dashboard in that colour (scope attribute)
  - changing the colour in Manage class updates the dashboard and switcher
  - the switcher marks each class with its colour's name for screen readers
  - the bands key is present
  - "No evidence yet" cells are unaffected
  - the demo class is teal
- **Play shell rendered-app tests** (prior art: the play shell's App.test.tsx and Locker.test.tsx). Cover:
  - a student in two classes sees each class section in its own colour
  - a play opened from a game link renders shell chrome in that class's colour
  - spoken labels are unchanged
- **API contract suites over Postgres** (prior art: each app's platform API contract tests). Cover:
  - colour round-trips on create and on set
  - the default picks the first unused colour, and cycles when all are used
  - unknown slugs are rejected
  - another teacher can't set it
  - the migration leaves existing classes as teal
  - memberships and the locker carry the colour
- **The look, in headless Chrome** (see `docs/agents/frontend-testing.md`). Screenshot the dashboard, a student page, quick assess, the new-class form and the locker at 1366×768 and 360×640, in teal and two other class colours (one light, such as amber, and one dark, such as indigo). Compare them with the Design reference boards, and measure touch targets (48 px; 64 px for Grades 1–2). The founder signs off on the look.
- Check Chromebook budgets for the play shell after the font change.

## Out of Scope

- Students choosing colours, or any per-student theme.
- Colours the teacher can enter freely (a hex picker). Only the fixed set.
- Dark mode.
- Restyling game internals or game art. Only the shell around games changes.
- Redesigning the marketing site's layouts, and re-rendering marketing videos in `packages/marketing`.
- Renaming Kindling. The brand name stays a single token, so it's easy to change later.
- The class world.
- Illustrated locker art for each game, beyond a named slot and a placeholder.

## Further Notes

- The founder chose teal on 2026-10-30 and is not tied to the ember hue, since "Kindling" is a working name.
- Avoid the rejected "kiddy" styles: no chunky ink outlines, sticker badges, candy pastels or neon, even on the student side. The locker gets its energy from colour, big cards and pictures.
- Copy, wording and layout order stay as they are in the apps today. The boards are a guide to the look, not the words.
- Keep teacher screens to the controls they have now, plus the colour picker in the two places named.
