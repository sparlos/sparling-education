# Fraction Hop

Status: approved
Slug: fraction-hop (game link: /play/fraction-hop)
Version: 1
Renderer: dom
Avatar: character

## Why it's fun

The founder played two prototypes in the lab on 2026-10-24 and picked **Hop Code** (`apps/play/src/lab/hop-code`), renamed Fraction Hop for clarity.

- **What hooked them:** "plan a route, press the button, and see what happens". The plan, run and reveal loop is the game. It borrows from coding games (Lightbot: build a program, then watch it run) and from Mario's hops over pits. The plan is a puzzle; the run is the reveal, and a splash shows exactly which hop was wrong.
- **How they played it:** by building a route one hop at a time and pressing play after each, until they reached the goal. That exploring is the intended way to play, and it never counts against a student (see Attempts).
- **Rejected: Spring Run** (`lab/spring-run`, archived). The student put fraction cards on fixed springs. There was less to explore, and each spring starting from a different point on the number line was "kind of weird": it wasn't obvious what the fractions were doing. **Lesson kept:** every hop starts where the last one landed, building out from 0, so each fraction is a visible distance.
- **Also rejected earlier:** Plank Bridge (cutting planks to fill bridge gaps), as "not fun, bad concept". Don't reuse it.

## Concept

A fraction is a count of equal unit pieces, and so a distance on a number line: three eighths is three one-eighth hops from 0. Grades 3–5: Grade 3 counts unit fractions up to two wholes, Grade 4 counts them past one whole, and Grade 5 finds equivalent fractions to reach a goal named in simplest form.

## Mechanic

The screen is a side view of a course over water: a number line from 0 to a few wholes, with ticks, stones (grass) at some tick positions, and water between them. The student's avatar stands at 0.

1. **The goal is hidden.** Only its fraction is shown ("Goal at ³⁄₈") and spoken. Its place on the course isn't marked until it's found.
2. **Build a plan.** Below the course are hop blocks, each labelled with a fraction (⅛, ¼, 1). All blocks are the same size and shape: only the fraction says how far a block hops. Dragging a block drops it into the plan where it's let go, and tapping one adds it to the end. A planned block can be dragged to another place in the plan, or dragged back to the hops (or tapped) to remove it. Hops guided placed stay put. The plan has as many empty slots as the task's **hop budget**, so the budget is visible without reading.
3. **Press play.** The avatar hops the plan from 0, one hop at a time, each starting where the last one landed. A run ends when:
   - a hop lands in water: **splash**, the avatar sinks at that exact spot, and the gap is plain to see,
   - the plan runs out before the goal, on grass: the avatar stands where it stopped, and the landing fraction is shown,
   - the plan goes past the goal: the avatar lands beyond it, and its landing fraction is shown and spoken beside the goal's. The goal's place stays hidden: it's marked only when it's reached, or on purpose by hint 1 or guided (founder's call: showing it after any overshoot gave it away),
   - the last hop lands exactly on the goal: the goal is revealed and the avatar cheers.
4. **Change the plan and run again,** as often as the student likes, until the goal is reached. Then the next task.

**Ticks** split each whole by the largest denominator on offer in the task, at every tier. They're unlabelled until hint 1.

**Why getting better at it is getting better at the concept:** reaching a goal at ³⁄₈ means knowing it's three one-eighth hops (G3), reaching ⁷⁄₄ means counting fourths past one whole (G4), and reaching ⅔ on a course ticked in twelfths with ⅓, ¼, ⅙ and 1⁄12 hops in a tight budget means seeing ⅔ as two thirds, or eight twelfths (G5).

**What visibly fails:** a wrong idea sends the avatar into the water at a precise spot, or past the goal with its landing fraction shown beside the goal's. See Misconceptions.

## Tiers

Every tier: 6 tasks per play. Tasks 1–2 offer only the goal's unit fraction block and the whole hop; tasks 3–6 offer the tier's full block set. Goals are never whole numbers. The course always extends at least half a whole past the goal, and has spare stones beyond it, so neither the course's end nor its last stone gives the goal away.

### g3: Grade 3

- Expectations: `math-2020.g3.B2.8`
- Tasks: one unit fraction family per task, with denominators 2, 3, 4, 5, 6, 8 or 10. Blocks: the goal's unit fraction, the whole hop, and from task 3 a **bigger distractor** where one exists (½ with ¼, ¼ with ⅛, ⅓ with ⅙, ⅕ with ⅒). The goal is shown in its unit (³⁄₈, ⁵⁄₄), from two units up to two wholes. Ticks are in the goal's unit. Stones lie only at the goal unit's positions. The course has gaps that a run of the goal's unit hops can't cross but a whole hop can. Hop budget: the fewest hops to the goal, plus 1.

### g4: Grade 4

- Expectations: `math-2020.g4.B1.6`
- Tasks: as Grade 3 (same denominators, blocks, distractors and stone rules), but every goal lies **past one whole**, up to two and a half (⁷⁄₄, ¹¹⁄₆). The goal is always shown in its unit, never simplified (⁶⁄₄, not ³⁄₂), so reaching it needs counting, not equivalence. Hop budget: the goal's numerator plus 1, so counting in the goal's unit always fits; trading hops is Grade 5's challenge.

### g5: Grade 5

- Expectations: `math-2020.g5.B1.3`
- Tasks: one block set per task, from: {1⁄12, ⅙, ¼, ⅓}, {⅛, ¼, ½}, {⅙, ⅓, ½}, {1⁄10, ⅕, ½}, plus the whole hop. Ticks are in the set's largest denominator. The goal is shown in **simplest form**, with a denominator different from the ticks' (⅔ on a twelfths course; ⁵⁄₄ on an eighths course), up to two and a half, improper fractions included. The course must not be crossable with the smallest block alone. Hop budget: the fewest hops to the goal, so the student has to trade small hops for bigger, equivalent ones.

## Misconceptions

A misconception is spotted only in a **miss** (see Attempts), never in a probe.

### `bigger-denominator-bigger`

- The wrong idea: a fraction with a bigger bottom number is a bigger piece, so ⅛ hops further than ¼.
- In play: to clear a gap, the student adds the block with the bigger denominator. It hops short and splashes, right where the other block would have landed on a stone.
- Pattern: a splash on a unit-fraction hop, where another unit-fraction block on offer, with a smaller denominator, would have landed on a stone from the same start. Recorded after **2** matches in a task.
- Expectations: `math-2020.g3.B2.8`, `math-2020.g4.B1.6`, `math-2020.g5.B1.3`

### `numerator-not-a-count`

- The wrong idea: the top number says how many hops, whatever their size, so ³⁄₈ is three of any hop.
- In play: for a goal at ³⁄₈, three ¼ hops. The avatar overshoots and lands at ⁶⁄₈ (G3 and G4 say the landing in the goal's unit), past the goal.
- Pattern: a miss whose plan is exactly as many hops as the goal's shown numerator, all of one unit-fraction block whose denominator isn't the goal's shown denominator. Recorded after **1** match.
- Expectations: `math-2020.g3.B2.8`, `math-2020.g4.B1.6`, `math-2020.g5.B1.3`

### `no-equivalence`

- The wrong idea: an amount can only be built from the smallest piece. It doesn't see that two fourths make one half.
- In play: at Grade 5, the student fills the plan with the smallest block and runs out of hops before the goal. Tapping another block is refused ("Your plan is full. Try bigger hops.").
- Pattern: tapping a block when the plan is full and every planned hop is the smallest block. Counts as a miss (once per distinct plan). Recorded after **1** match.
- Expectations: `math-2020.g5.B1.3`

## Attempts

Every run ends as one of:

| Run ends | Kind | Counts? |
| --- | --- | --- |
| Short of the goal, on grass | **probe** | Never. Probing is how the game is played. |
| Splash before the goal's position | **miss**, unless the same hop at the same position already splashed in this task: then a **rerun** of a known mistake | Yes. A rerun climbs the help ladder (running the same failing plan again is a sign of being stuck) but adds no misconception match (founder's call). |
| Splash past the goal's position | **miss** | Yes |
| Past the goal, on grass | **miss** | Yes |
| Exactly on the goal | **solve** | Ends the task |

Plus one plan event that counts as a miss: `no-equivalence`'s full-plan tap (G5).

- One task is: one course, from showing the goal to reaching it.
- An attempt is recorded when: the task is solved. Exactly **one attempt per task**. Leaving mid-task records no attempt for it (the shell records the play as left by the student).
- Success means: the goal was reached. With guided help every task ends solved, so `succeeded` is always true, and `assisted` carries how: absent (on their own), `hint` (either hint level was used) or `guided`. `demonstration` is never used.
- Misconception: at most one per attempt, from the task's misses, as each misconception's threshold says. If several qualify, the most matches wins, and on a tie the one seen first. It's recorded even though the task was then solved: "got there, but showed this along the way" is what a teacher reteaches from.
- Expectation: the tier's single expectation.
- Retries of the same task are recognised by: the task ID `task-<n>`, n = 1–6 in the play. Runs inside a task are never separate attempts.
- Logged locally only (for tuning, never sent): the hint level reached, and the miss and probe counts per task.

The thresholds (2, 3 and 4 misses for the help steps, 1 or 2 matches per misconception) are starting numbers, to be tuned from real play.

## Effort

Retrying is the loop itself: a run costs nothing, and a probe never counts. After a miss the result is shown in place (the splash spot, or the landing fraction beside the goal's), so the student can see which hop to change.

**The help ladder**, one task at a time, reset at the next task:

1. **Hint button**, always available. It starts to glow after **2 misses**, with a ring that pushes out and fades, over and over, and the ghost hand glides from the middle of the screen to the button while the voice offers the hint, then fades after a couple of seconds, so it invites a tap without demanding one. Tapping it turns on **hint 1**: the goal is marked, and every tick shows its fraction ("1⁄8, 2⁄8, 3⁄8…", in the ticks' unit).
2. After **3 misses** in all, at least one of them with hint 1 on, the button glows again. Tapping it turns on **hint 2**: every block added to the plan previews its hop as an arc, from where the plan currently ends to where it would land.
3. After **4 misses** in all, whatever hints were taken, **guided** starts by itself: "Let's do it together." The voice counts along the ticks to the goal ("one eighth, two eighths, three eighths"). The game clears the plan and places the first hop of a correct route, and the student adds the rest. After each further miss, it places one more hop. The student always presses play and finishes the course.

Once help is on, it stays on until the end of that task. The steps were 2, 4 and 6 misses; the founder found 6 too many before guided (2026-10-24).

**Discouraging spamming** without a score: misses climb the help ladder, so a spammer ends up guided, and their attempts say so. A "Nice fix!" cheer, with a sparkle and a pop on the first hop that lands past the old splash, when the run right after a splash has no splash and ends further along: it stops short on grass or finds the goal. An overshoot is still a miss, so it never cheers (founder's call, polish pass). It's never recorded. An identical rerun isn't refused: it climbs the help ladder instead.

No combos, coins, points or streaks: rewards follow effort and are Kindling's to compute (DESIGN.md principle 5).

## Avatar

`character`: the student's portrait is the hopper, drawn through the `hopper` art slot, so a full-body 2D character can replace it later without code changes. It squashes on takeoff and landing and arcs on each hop, with the arc's height proportional to the hop's length.

Expressions:

- `thinking`: while the student builds a plan,
- `happy`: on each landing on grass,
- `encouraging`: after a splash or an overshoot,
- `cheering`: on reaching the goal, and at the end of the play.
- `neutral` otherwise.

The contract's character API starts minimal: the portrait at any size, with an expression. Moving it along the course is the game's own job.

## Touch, reading and sound

- **Touch only, drag or tap:** drag a block into the plan, drag planned blocks to reorder them or back to the hops to remove them, and tap play, hint and skip. Every drag also has a tap: tap a block to add it to the end, tap a planned block to remove it, so a student who can't drag can still play everything but reordering, which removing and re-adding covers (founder's call, polish pass). A drag starts after 8 px of movement, so a tap stays a tap. Every tap target is at least **64 px**. Ticks and stones are never tapped, so twelfths can be as narrow as the course needs.
- **No reading:** the only text a student needs is fraction notation (the goal and the blocks), and that notation is what's being taught. Every instruction is a caption and a voice line from the same string. The goal is spoken at the start of each task, a block when it's tapped, and the landing after each run. The tutorial shows every move.
- **No sound needed:** every result shows on screen: the splash at the exact spot, the landing fraction on the course and the goal's in the caption, the goal revealed when it's reached, and the hint labels and arcs.
- **A start tap before any sound:** browsers block audio until the page is tapped, so the shell shows a start button before every game. The game's first line comes after it.
- **The game always fits the screen,** with no page scrolling or zooming, at 1366 × 650 and 1280 × 650 (a Chromebook window with browser chrome) and larger. The goal's caption is never cut off. The browser tour checks this.
- **Progress:** a progression-based game (`progress` in the manifest): the shell's thin bar above the game shows tasks solved, from 0/6 to 6/6. Feedback that the student is getting somewhere, never a score.
- **Wording:** "goal", never "flag", in everything a student sees or hears.

## Tutorial

A scripted, in-code "video": the avatar and a ghost hand act out one course while the voice explains (strings `tutorial.*`). It opens with a welcome ("Welcome to Fraction Hop!"), then shows: the goal's fraction, dragging two blocks into the plan, pressing play, a hop splashing, fixing it by dragging the hops into the other order, and reaching the goal. It plays at the start of every play, before task 1, and a skip button ends it at any time. It's never recorded as help.

**The voice and the hand take turns, never both at once** (founder's call). A line is said first, and the hand may rest on what it's about while it's said. Then the hand acts. Each step waits for the voice to finish (the contract's `say` settles when it has), rather than guessing a line's length. The buttons the hand taps look enabled, though the student can't tap them. On the lower half of the screen, the hand points down from above.

Later, when the contract can remember things per student: play it only the first time, and again when a block type appears that the student hasn't seen.

## Strings

Every string a student sees or hears; each becomes a voice line. Sentences are whole strings, and amounts are fragments joined by `say(...ids)`.

| ID | English |
| --- | --- |
| `title` | Fraction Hop |
| `tutorial.welcome` | Welcome to Fraction Hop! |
| `tutorial.goal` | The goal is hidden over the water. Its fraction tells you how far away it is. |
| `tutorial.plan` | Drag the hops into your plan. Each hop goes as far as its fraction. |
| `tutorial.play` | Then press play, and watch your hops. |
| `tutorial.splash` | Splash! That hop landed in the water. Change it, and try again. |
| `tutorial.goal-found` | No hop landed in the water, and the last one landed on the goal. Now you try! |
| `ui.skip` | Skip |
| `ui.play` | Play |
| `ui.hint` | Hint |
| `ui.goal-at` | Goal at |
| `ui.plan` | Your plan |
| `ui.hops` | Hops |
| `task.goal-is-at` | The goal is at |
| `task.make-a-plan` | Make a plan, then press play. |
| `plan.full` | Your plan is full. Try bigger hops. |
| `plan.empty` | Add some hops first. |
| `run.splash` | Splash! That hop landed in the water. |
| `run.landed-at` | You landed at |
| `run.past-goal` | That's past the goal. |
| `run.stopped-at` | You stopped at |
| `run.keep-going` | Keep going! |
| `run.solved` | You found the goal! |
| `run.nice-fix` | Nice fix! |
| `hint.ready` | Want a hint? Tap the hint button. |
| `hint.ready-again` | Want another hint? Tap the hint button again. |
| `hint.labels` | Now you can see the goal, and every mark shows its fraction. |
| `hint.arcs` | Now every hop you add shows where it will land. |
| `guided.start` | Let's do it together. |
| `guided.count` | Count to the goal: |
| `guided.first-hop` | I'll add the first hop. You add the rest. |
| `guided.one-more` | Here's one more hop. |
| `task.next` | On to the next course! |
| `play.done` | You reached every goal. Great hopping! |
| `hop.1` | One whole hop |
| `hop.2` … `hop.12` | One half hop, One third hop, One fourth hop, One fifth hop, One sixth hop, One eighth hop, One tenth hop, One twelfth hop (`hop.<d>` for d = 2, 3, 4, 5, 6, 8, 10, 12) |
| `amount.<n>-<d>` | The amount family: "one eighth", "three eighths", "eleven fourths", "thirty-six twelfths". d = 2, 3, 4, 5, 6, 8, 10, 12, and n = 1 to 3 × d (150 strings), generated in the manifest from English number and unit words. |

How they combine:

- Task start: `say("task.goal-is-at", "amount.3-8", "task.make-a-plan")`.
- A block tapped: `say("hop.8")`.
- Probe: `say("run.stopped-at", "amount.2-8", "run.keep-going")`.
- Overshoot: `say("run.landed-at", "amount.6-8", "run.past-goal", "task.goal-is-at", "amount.3-8")`.
- Guided count: `say("guided.count", "amount.1-8", "amount.2-8", "amount.3-8")`.

**Every amount spoken is in the family:**
- The goal is spoken as shown: its unit at G3 and G4, simplest form at G5. G5 goals are at most 2½, with denominators 2–12 and simplest form, so every G5 goal is in the family.
- Landings are spoken in the ticks' unit at every tier, matching what hint 1 shows. A landing is never past the course's end, and **the course never runs past 3 wholes** (it ends at the first whole at least half a whole past the goal, so goals are at most 2½). So every landing is in the family.
- Hint 1's tick labels are visual notation, not strings.

Captions show fraction notation (³⁄₈) where an amount is spoken, so `amount.*` captions are rendered as notation, not as words.

## Art

Placeholder SVG first, from the style kit, each in a fixed frame with an anchor.

| Slot | What it shows |
| --- | --- |
| `hopper` | The avatar on the course (the portrait for now), anchored at its feet |
| `water` | The water along the course, tiling |
| `stone` | A grass stone at one tick position, anchored at its top centre |
| `start` | The bank at 0 |
| `goal` | The goal marker, revealed when found, or by hint 1 or guided, anchored at its base |
| `splash` | The splash where a hop lands in water |
| `block` | A hop block: one size for every fraction, with the fraction drawn on it |
| `slot` | An empty plan slot |
| `arc` | Hint 2's preview arc |
| `ghost-hand` | The tutorial's and guided's pointing hand |
| `sparkle` | The "Nice fix!" burst (polish) |
| `icon-play`, `icon-hint` | Button icons |

## Teacher card

- Teaches: fractions as counts of unit pieces and as distances on a number line, through to equivalent fractions.
- Grades and tiers: Grade 3 (g3), Grade 4 (g4), Grade 5 (g5).
- Expectations:
  - `math-2020.g3.B2.8`: Understands the top number of a fraction as a count of equal unit pieces, so three fifths is one fifth taken three times.
  - `math-2020.g4.B1.6`: Counts on by a unit fraction past one whole, for example one fourth, two fourths and on to eleven fourths, with or without a model.
  - `math-2020.g5.B1.3`: Makes and recognises equal-value fractions up to twelfths by splitting or merging parts, including fractions greater than one written as improper fractions or mixed numbers.
- The mechanic in 30 seconds: a goal is hidden over the water, and only its fraction is shown. Students build a route from fraction hops, press play, and watch their avatar hop it. A wrong hop splashes at the exact spot, or lands past the goal, so students see what went wrong and fix it. Trying things out never counts against them.
- Results: per expectation, each task reads *on their own*, *with a hint* or *guided*, plus any misconception shown along the way.
- Misconceptions it reveals:
  - `bigger-denominator-bigger`: "Thinks a fraction with a bigger bottom number is a bigger piece (e.g. ⅛ > ¼)." Reteach: fold paper strips into fourths and eighths and compare the pieces.
  - `numerator-not-a-count`: "Counts the right number of pieces, but pieces of the wrong size (e.g. three fourths for three eighths)." Reteach: name the unit aloud while counting: "one eighth, two eighths…".
  - `no-equivalence` (Grade 5): "Builds amounts only from the smallest piece, without seeing that two fourths make one half." Reteach: trade strips on a fraction wall, two fourths for one half.
  - In results, e.g. "4 students counted pieces of the wrong size".
- When to use it: after introducing unit fractions on a number line (Grade 3), counting by fractions past one (Grade 4), or equivalent fractions (Grade 5). It reinforces the idea; it doesn't introduce it.

## Polish pass

After the core game plays well, not before:

- "Nice fix!" and a sparkle, when the run after a splash has no splash and gets further (done 2026-10-24; see Effort),
- highlighting each plan block as its hop runs,
- a tighter layout and motion (the screen-fit requirement itself isn't polish),
- dragging blocks into the plan, and to reorder it (done 2026-10-24).

Whether visual polish becomes its own skill is decided after this build (see `.scratch/game-framework/spec.md`, step 10).

## Open questions

- **`numerator-not-a-count` with a smaller wrong unit is a probe.** Two 1⁄12 hops for ⅔ stop short on grass, which never counts, so that direction goes unseen. Only the overshoot direction (three ¼ for ³⁄₈) is recorded. Accepted for v1; revisit if teachers miss it.
- **The tutorial plays every play** until the contract can remember per student which block types they've seen. Add that to the contract during the build if it's cheap.
- **Thresholds** (misses per help step, matches per misconception) are starting numbers, to tune from the locally logged counts.
- **Separate tasks, not this game's:** the portrait's expressions look "weird/ugly" (fix in `@repo/avatar`'s portrait, shared by every game). A repeat block ("3 × ¼ hop", like Lightbot's loops) would evidence `math-2020.g4.B2.7`: prototype it later, maybe as the second MVP game.
