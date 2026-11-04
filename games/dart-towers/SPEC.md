# Dart Towers

Status: approved
Slug: dart-towers (game link: /play/dart-towers)
Version: 1
Renderer: dom
Avatar: character
Description: Load exactly enough darts to stop every bug before sunrise, but one too many will smash the greenhouse! Teaches multiplication.

## Why it's fun

The founder played two prototypes in the lab on 2026-11-03 and picked **Dart Towers** (`apps/play/src/lab/dart-towers`): "dart towers is good, really like the idea", then "def my pick!"

- **What hooked them:** the loop of Plants vs. Zombies and Bloons, which they named as games they enjoy: prepare, press go, then watch your defences work with a wave coming at you. It's the same set-up-then-payoff they liked in Fraction Hop, Crystal Machine and Cargo Line.
- **The founder's two changes (2026-11-04):** take away the label that gave the total away ("X lanes of X bugs"), so that later waves need the multiplying to happen from the parts on screen. And put something behind the bugs that extra darts damage or destroy, "so you have to be EXACT". That became the greenhouse.
- **The journey:** the founder chose holding out until sunrise over marching to a nest or blooming a greenhouse, played it, and said "yep, perf".
- **Rejected: Gate Run** (`lab/gate-run`, archived). Tap one gate at each fork so a crowd of runners fills a stadium exactly. Played and not picked.
- **Rejected earlier: Array Blast, Seed Count and Seed Stamp** (archived). Filling or fencing a rectangle: "it was just kind of confusing. and hard to figure out the block sizes." Here the game makes the split, so there are no block sizes to work out.
- **Never reuse:** Plank Bridge (cutting planks to fill bridge gaps), rejected as "not fun, bad concept".

## Concept

Multiplying by splitting into parts, working out each part and adding the parts together. Grades 3–5: up to 10 × 10 (Grade 3), a two- or three-digit number by a one-digit number and by 10, 100 and 1000 (Grade 4), and a two-digit number by a two-digit number (Grade 5).

## Mechanic

Each wave of bugs is one task.

**The field.** The garden of the splash: a big sky and the sun over two lines of hills with pines, and the wall and greenhouse standing on the grass. The wall and five towers are on the left, with the student's avatar on the wall. There are always five towers, not one a lane, so they stay readable on 30-lane waves. The swarm is in the middle. The greenhouse stands behind the swarm, on the right. The number pad, the dart counter and Fire are in a column beside the field.

**The swarm comes in parts.** Each part has its own colour and a label, such as 6 × 20 and 6 × 7, or 20 × 30, 20 × 8, 4 × 30 and 4 × 8 at Grade 5. The game makes the split, and the student never chooses it. Nothing on screen or in the voice gives the wave's total, or its size as one multiplication at Grades 4–5 when it has parts: the student has to multiply from the parts.

**How a swarm is drawn:**

- **Separate bugs** while each bug is at least 14 px on a 1366 × 650 screen, to scale.
- **Solid swarm blocks** on bigger waves, one block a part, filling the field with room for every label. They're not to scale (the founder's call), as in the unscaled rectangles teachers use for multiplication. This also stops students counting bugs. The darts eat a block away from its near side, in proportion.

**One play of a wave:**

1. **Type one total** on the number pad. It appears in the dart counter. One number, not one per part (the founder's call): adding the parts together is part of the skill. The pad ignores a leading zero.
2. **Press Fire.** Fire is off until a number is typed. Streaks of darts fly from the towers and clear the parts one at a time, in order. The counter runs down through the whole volley at one speed, so it doesn't stop on the number of extras.
3. **Where it ends:**
   - **Exactly right.** Every bug is gone and the greenhouse is whole. The voice says "Every bug stopped, and the greenhouse is safe! 6 times 27 is 162." The wave is done.
   - **Too few.** The darts run out. What's left of the swarm marches to the wall as one, keeping its shape and passing over the towers, and the wall turns red. "Not enough darts. Some bugs reached your wall."
   - **Too many.** Every bug is gone, and the extras fly on and break the greenhouse's 18 panes in a scattered order. "Too many darts! The extras smashed the greenhouse glass." One extra dart always breaks exactly one pane, even on a tiny wave, and as many extras as there were bugs breaks all 18. In between, it's in proportion, rounded up.

   After a miss, the picture holds still for as long as the student needs. The pad stays off and the counter stays at 0 until the student taps **Try again**, which puts the swarm and the glass back, clears the pad and says "How many darts do you need?", as often as they like.

**A miss never states a number.** The student never hears how many bugs got through, how many extras there were, or what the total was. Those would give the answer away by adding or taking away. They see the size of the miss: how much swarm is left, or how many panes broke.

**Why getting better at it is getting better at the concept:** the only way to stop every bug is to work out each part and add the parts. The picture is the area model the curriculum uses: rows and columns split along tens and ones.

**What visibly fails:** too few darts leave bugs standing, and too many break the glass. See Misconceptions.

**Grade 3 can be counted.** On a wave of separate bugs a student can count them. That's fine at this tier, where the curriculum expects skip counting to build multiplication, and the wave's rows make it easier than counting one by one.

## Journey

Kind: going somewhere, through time. One play is one night, from dark to morning (the founder's call over a place to travel to, played in `lab/dart-towers`).

- **From the start:** a dark sky over the hills, the sun hidden behind them. The voice says "Hold off the bugs until the sun comes up."
- **After each task:** in about 1.5 seconds, with no voice and nothing to tap, the sky and the field lighten and the sun climbs a little. The next wave arrives by itself, with its own line. Fire and the pad are off while the sky moves.
- **The end:** after wave 6, the view tilts up and the sun rises with its rays, about 5 seconds. The last few bugs scatter off the edges of the field, the greenhouse catches the light, the avatar cheers, and the voice says "You made it to morning!" The words are written on the field, because the screen's controls and caption fade out for the sunrise.

| Waves | The sky | The field |
| --- | --- | --- |
| Before wave 1 | Dark indigo with stars, no sun | Dark blue, nearly black |
| After waves 1–2 | Violet, the stars fading | Dark blue-green |
| After waves 3–4 | Pink dawn with clouds, the sun showing | Green waking up |
| After wave 5 | Pale gold, the sun above the hills | Green |
| After wave 6 | Blue morning | Bright green |

The night is the same for every student, however much help they had, and starts again in the dark each play. The greenhouse is whole again after every miss, so it never carries a mark from one wave to the next and always ends whole. Nothing from the night is kept after the play.

## Tiers

Every tier: **6 waves per play**, getting harder. Each wave keeps its kind of challenge, with numbers that change from play to play. Examples below. Within a kind, the smaller total comes first. No two waves in a play share a total, and the game never makes a wave where two wrong ideas predict the same number (3 × 9, where 3 + 9 equals the 3 × 4 part). One-digit numbers on these waves run from 3 to 9, so the hint's second count on a one-part wave is never the answer.

### g3: Grade 3

- Expectations: `math-2020.g3.B2.6`
- Tasks: `4×5  3×10  6×7  4×6  6×9  7×8`.
  - Waves 1–2: a fact for 2, 5 or 10, as one part.
  - Waves 3–6: a harder fact up to 10 × 10, split on a known fact for 5: 6 × 7 is 6 × 5 and 6 × 2.
- Drawn as separate bugs.
- The pad takes 3 digits.

### g4: Grade 4

- Expectations: `math-2020.g4.B2.5`
- Tasks: `8×100  3×14  6×27  8×21  3×124  5×136`.
  - Wave 1: a one-digit number by 10, 100 or 1000, as one part.
  - Waves 2–4: a one-digit number by a two-digit number, split into tens and ones.
  - Waves 5–6: a one-digit number by a three-digit number from 111 to 299, split into hundreds, tens and ones.
- The pad takes 5 digits.

### g5: Grade 5

- Expectations: `math-2020.g5.B2.6`
- Tasks: `12×15  14×13  23×17  24×38  31×22  41×32`. Each wave is split into tens and ones both ways, making four parts.
  - Waves 1–2: both numbers in the teens.
  - Waves 3–4: one or both numbers in the twenties or thirties, the second with a harder ones digit.
  - Waves 5–6: bigger products with friendly digits (founder's call): tens from 2 to 4 and ones from 1 to 3, so each part is quick to work out, with a total of at least 600. 41 × 32 is 1200 + 80 + 30 + 2.
- The pad takes 5 digits, so 20 × 30 worked out as 6000 can be loaded.
- **Without paper:** the student can hold the running total, or use the notebook once the shell has one. The game works without it.

## Misconceptions

A misconception is spotted only on a miss. Each is matched by working out what the wrong idea would have produced on this wave and comparing it with the typed number. If a typed number matches more than one, the first in this list wins. Any other miss has no misconception.

### `adds-instead-of-multiplies`

- The wrong idea: multiplying means adding the two numbers.
- In play: 6 × 9 loaded as 6 + 9. The darts run out almost at once, and most of the bugs reach the wall.
- Pattern: the typed number is the wave's two numbers added.
- Expectations: `math-2020.g3.B2.6`, `math-2020.g4.B2.5`, `math-2020.g5.B2.6`

### `only-adds-the-ones`

- The wrong idea: multiply the tens, then just add the ones on.
- In play: 6 × 27 loaded as 120 + 7. The 6 × 20 part clears, then the darts run out in the 6 × 7 part.
- Pattern: a wave whose second number has non-zero ones, where the typed number is the first number times the rest of the second, plus those ones.
- Expectations: `math-2020.g4.B2.5`, `math-2020.g5.B2.6`

### `leaves-out-a-part`

- The wrong idea: only some of the parts count. At Grade 5, it's often multiplying tens by tens and ones by ones, and forgetting the two in between.
- In play: 24 × 38 loaded as 600 + 32. Bugs are still standing when the darts run out.
- Pattern: a wave of two or more parts, where the typed number is the sum of some but not all of its parts.
- Expectations: `math-2020.g3.B2.6`, `math-2020.g4.B2.5`, `math-2020.g5.B2.6`

### `wrong-number-of-zeros`

- The wrong idea: the zeros in tens and hundreds don't follow a pattern, so there can be one too many or one too few.
- In play: 20 × 30 worked out as 6000 smashes the whole greenhouse. Worked out as 60, it leaves bugs standing.
- Pattern: the typed number is the wave's parts added, with exactly one part that has a 10, 100 or 1000 in it made ten times too big or ten times too small.
- Expectations: `math-2020.g4.B2.5`, `math-2020.g5.B2.6`

## Attempts

- One task is: one wave, from when it arrives until the student loads exactly the right number of darts.
- One try, recorded as one attempt as it happens: **each press of Fire.** There are no exploring tries: the only thing to try is the total, so every try is a real answer.
- Success means: the darts loaded equal the wave's total.
- Expectation: the tier's one expectation.
- The same number as the try before is a miss, and never adds a misconception match.
- Retries of the same task are recognised by: the task ID `wave-<n>`, n = 1–6 in the play.
- `assisted` on each attempt: absent until the student taps the hint, then `hint` on that try and every later try at that wave. `demonstration` and `guided` are never used.
- Misconception: at most one per task, on the first miss that matches.
- Leaving mid-wave keeps that wave's tries so far.

**What the teacher sees for each task and try.** Plain text, from the rules' state. Numbers of 10 000 or more are written with a space (63 120). The game never shows the student these numbers during a wave.

| Field | When | Text |
| --- | --- | --- |
| `asked` | Every try at a one-part wave | `Stop 4 × 5 bugs.` |
| `asked` | Every try at a wave with parts | `Stop 24 × 38 bugs. Parts: 20 × 30, 20 × 8, 4 × 30, 4 × 8.` |
| `detail` | Too few | `Loaded 632 darts: 280 bugs got through.` |
| `detail` | One short | `Loaded 911 darts: 1 bug got through.` |
| `detail` | Too many | `Loaded 6312 darts: 5400 extra darts hit the greenhouse.` |
| `detail` | One extra | `Loaded 913 darts: 1 extra dart hit the greenhouse.` |
| `detail` | Exactly right | `Loaded 912 darts: stopped every bug.` |
| `detail` | The same number as the try before | `Loaded 632 darts again: 280 bugs got through.` |

The longest `asked` (Grade 5, four parts) stays under 80 characters.

## Effort

Retrying is the loop itself: a volley costs nothing, there's no limit on tries, and Try again puts the wave back as it was.

**The hint.** The hint button is always beside the pad, off until the first wrong try on a wave. Then it glows until its first tap, and the voice offers it: "Want a hint? Tap the hint button." It can be tapped while a miss is still on screen. Each tap shows one more part's answer in the part's label (6 × 20 = 120), and says it: "6 times 20 is 120." The last part never gets an answer, so the student always has some multiplying and the adding to do.

On a one-part wave, the hint counts along the first two lanes (4 × 5 shows 5, then 10, and 8 × 100 shows 100, then 200), then stops. The button turns off when there's nothing more to show.

Answers shown stay on screen until the wave is done, including through Try again. The hint resets at the next wave.

**Discouraging guessing,** with no score: each miss only says too few or too many, so narrowing it down by guessing takes many volleys, and every one is listed for the teacher. No combos, coins, points or streaks: rewards follow effort and are the platform's to compute (DESIGN.md principle 5).

## Avatar

`character`: the student's avatar stands on top of the wall as the commander, drawn through the `commander` art slot, with a pointing arm on Fire. It stays there through the sunrise. It uses only the contract's expressions:

- `thinking`: while the student types,
- `neutral`: while the darts fly,
- `cheering`: when every bug is stopped, and at sunrise,
- `encouraging`: after bugs get through or glass breaks.

## Touch, reading and sound

- **Touch only, tap only:** pad keys, Fire, Try again, hint and the tutorial's Skip. No dragging. Every tap target is at least **64 px**.
- **No reading:** the swarm's labels are numerals and ×. Every wave's parts and every instruction are spoken, and captioned from the same strings, with numerals as on screen.
- **No sound needed:** every result is on screen: bugs at a red wall, broken panes, or a clear field with the glass whole. The sky shows the journey.
- **Reduced motion:** the swarm jumps to its final state with no streaks or marching, panes change without an animation, the sky changes in one step and the sun doesn't travel. None of the effects below play.
- **Effects** (never a number, and they don't slow the counter): a tower kicks and flashes as a dart leaves. Each dart flies at the bug it stops or the pane it breaks: one a bug on a small wave, a thick stream on a big one. A bug bursts into a puff and bits, a cleared part leaves a faint patch under its label and the field shakes, a broken pane throws shards, and the bugs slam into the wall with a bigger shake. Bugs march in from behind the greenhouse and shuffle while they wait. When every bug is stopped, however many tries it took, sparkles and a hop come before the voice. A swarm at the wall holds still.
- **Sound effects:** `dart-fire` as a dart leaves, `bug-pop` as bugs go down, `glass-smash` for a broken pane, `wall-thud` as the swarm hits the wall, `wave-clear` when every bug is stopped, and lower at sunrise. Synthesised stand-ins from `audio/synth.mjs`.
- **The game always fits the screen,** with no scrolling or zooming, at 1366 × 650 and 1280 × 650 and larger: the field, the greenhouse, every label, the pad, the counter, Fire or Try again and hint. Labels never overlap each other or the greenhouse. The browser tour checks this.
- **Progress:** a progression-based game (`progress` in the manifest): the shell's thin bar shows waves done, from 0/6 to 6/6. The sky shows the same thing.
- **The notebook** (once the shell has one): the game hands it a strip of the wave's labelled parts as the problem picture, and marks each wave's start so it clears. Nothing here depends on it.

## Tutorial

A scripted, in-code demonstration of about 15 seconds on the student's first play of Dart Towers only, in any class and at any tier (the shell's `firstPlay`). The student taps nothing. A skip button ends it at any time. Nothing in it is recorded, and it's never counted as help. The voice speaks first, then the game acts, never both at once: each step waits for `say` to settle.

1. A tiny wave of 2 lanes of 3 bugs at night, labelled 2 × 3. "One dart stops one bug." A pointing hand taps the number and Fire, the counter shows 6, and the towers fire and clear the wave.
2. The same wave again. The hand taps again, and the counter shows 7. Six darts clear the wave, and the seventh flies on and cracks one pane. "Extras break the greenhouse."
3. The glass mends. "Now it's your turn! Hold off the bugs until the sun comes up." Then wave 1 arrives.

A returning student, or one who taps Skip, hears "Hold off the bugs until the sun comes up." Then wave 1 arrives.

## Strings

Every string a student sees or hears. Each one also becomes a voice line. Sentences are whole strings, and numbers are fragments joined by `say(...ids)`. `title` is the game's name, as home shows and says it.

| ID | English |
| --- | --- |
| `title` | Dart Towers |
| `play.goal` | Hold off the bugs until the sun comes up. |
| `play.done` | You made it to morning! |
| `tutorial.one-dart` | One dart stops one bug. |
| `tutorial.extras` | Extras break the greenhouse. |
| `tutorial.your-turn` | Now it's your turn! |
| `ui.fire` | Fire! |
| `ui.try-again` | Try again |
| `ui.hint` | Hint |
| `ui.skip` | Skip |
| `ui.darts` | darts |
| `wave.ask` | How many darts do you need? |
| `wave.rule` | One dart stops one bug, and extras smash the greenhouse. |
| `run.safe` | Every bug stopped, and the greenhouse is safe! |
| `run.short` | Not enough darts. Some bugs reached your wall. |
| `run.over` | Too many darts! The extras smashed the greenhouse glass. |
| `hint.ready` | Want a hint? Tap the hint button. |
| `op.times` | times |
| `op.plus` | plus |
| `op.is` | is |
| `num.1` … `num.99` | The number family: "one" to "ninety-nine", shared with Crystal Machine and Cargo Line. |
| `num.hundred` | hundred |
| `num.thousand` | thousand |

How they combine:

- A wave arrives, as one `say(...)`: "6 times 20, plus 6 times 7. How many darts do you need?" is `num.6 op.times num.20 op.plus num.6 op.times num.7 wave.ask`. On wave 1 of a play, `wave.rule` follows.
- A wave is done: `say("run.safe", "num.6", "op.times", "num.27", "op.is", "num.1", "num.hundred", "num.62")`. It's shown as "Every bug stopped, and the greenhouse is safe! 6 × 27 = 162."
- A hint: `say("num.6", "op.times", "num.20", "op.is", "num.1", "num.hundred", "num.20")`, or on a one-part wave `say("num.5")`, then `say("num.10")`.

**Every number spoken is in the family.** The game speaks only the numbers in a wave's parts, a part's answer, the first two lanes' running count and the wave's total. The largest is a total of 9000 at Grade 4 and under 2000 at Grade 5. All are said as `num.<1–99>`, `num.hundred` and `num.thousand` in English order. A number the student typed is never spoken, so the pad can take any number.

## Art

A toy garden at night, turning to morning: chunky wooden towers, round friendly bugs and a glass greenhouse with plants inside. Readable at a glance and nothing like a coin or a score. The sky and the field are drawn in code, so they can change colour through the night.

| Slot | What it shows |
| --- | --- |
| `hills-far`, `hills-near`, `pines` | Two lines of hills and their pines, as shapes the night's colour fills |
| `cloud`, `star` | The clouds and the stars, which fade in and out with the night |
| `sun`, `sun-rays` | The sun, and its rays for the end |
| `wall`, `wall-hit` | The wall on the left, and the same wall turned red |
| `tower` | One tower |
| `commander`, `commander-arm` | The avatar's stand on the wall (the avatar is the portrait for now), and its pointing arm, shown while the darts fly |
| `dart` | A dart streak |
| `bug-1` … `bug-4` | One bug, a colour for each part |
| `bug-straggler` | The last few bugs, running off at sunrise |
| `block-1` … `block-4` | A solid swarm block's tile, a colour for each part |
| `part-label` | The white label on a part |
| `greenhouse`, `pane`, `pane-broken` | The greenhouse's frame and plants, one whole pane and one broken pane |
| `flash`, `poof`, `bit`, `shard`, `sparkle` | The effects: a tower's muzzle flash, a bug's puff (tinted by its part), a thrown bit, a shard of glass, and the sparkle when a wave is stopped |

The hills, clouds, stars, label and effects are drawn in code, so the night can recolour them and they animate smoothly. Everything else comes from the files in `art/`. `art/share.png` is `art/splash.svg` as a PNG.

## Teacher card

- Teaches: multiplying by splitting into parts, working out each part and adding the parts together.
- Grades and tiers: Grades 3–5, a tier per grade.
- Expectations:
  - `math-2020.g3.B2.6`: Builds and draws times facts as far as 10 × 10, and sharing as far as 100 ÷ 10, with counters, number lines and rows and columns, connecting the picture to the number sentence. This game covers the times facts.
  - `math-2020.g4.B2.5`: Solves problems that multiply a two- or three-digit number by a one-digit number, or by 10, 100 or 1000, with tools such as arrays split into easy parts.
  - `math-2020.g5.B2.6`: Solves problems that multiply two two-digit numbers, with a rectangle split into parts and with a written method, and shows how the parts match the method's steps. This game covers the rectangle split into parts.
- The mechanic in 30 seconds: a swarm of bugs marches at the student's wall, coloured in parts labelled like 6 × 20 and 6 × 7. The student types how many darts to load and presses Fire. Too few and bugs reach the wall. Too many and the extras smash the greenhouse behind the bugs. Six waves take the night through to sunrise.
- Misconceptions it reveals (each shown on the dashboard as its sentence, with only the wrong working as the example):
  - `adds-instead-of-multiplies`: "Adds the two numbers instead of multiplying them (e.g. 6 × 9 as 6 + 9)." Reteach: lay out 6 rows of 9 counters and skip count the rows.
  - `only-adds-the-ones`: "Multiplies the tens, then adds the ones without multiplying them (e.g. 6 × 27 as 120 + 7)." Reteach: draw 6 rows of 27, split at 20. How many rows does the 7 side have?
  - `leaves-out-a-part`: "Leaves out part of the multiplication (e.g. 24 × 38 as 600 + 32, without 20 × 8 or 4 × 30)." Reteach: draw the rectangle split into four, and shade each part as it's worked out.
  - `wrong-number-of-zeros`: "Gets the zeros wrong when multiplying tens or hundreds (e.g. 20 × 30 as 6000 or as 60)." Reteach: 20 × 30 is 2 tens × 3 tens. Build it from 2 × 3 with base ten blocks or a place-value chart.
  - In results, e.g. "4 students left out part of the multiplication".
- When to use it: after the class has split a multiplication into parts with arrays or rectangles. At Grade 5, after the area model has been taught. Good for a 10–15 minute centre, with paper to hand at Grade 5.

## Open questions

- A student stuck on a wave has only the hint, which leaves the last part to them. Unlike Cargo Line, there's no "let's work it out together" replay (the founder chose the part-by-part hint). Check it in the pilot.
- A patient student could narrow down the total by guessing, from "too few" and "too many". It's slow and shows in their tries. Check whether it happens.
