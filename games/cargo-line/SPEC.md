# Cargo Line

Status: approved
Slug: cargo-line (game link: /play/cargo-line)
Version: 1
Renderer: dom
Avatar: character

## Why it's fun

The founder played three prototypes in the lab on 2026-11-01 and picked **Cargo Line** (`apps/play/src/lab/cargo-line`).

- **What hooked them:** "definitely the most fun and actually feels like it's teaching something." The addition and subtraction are obvious: you can see the load go up at a pickup and down at a drop-off. It's the plan-then-watch loop of Railbound and Train Valley (set up the line, press go, watch the train run it), the same loop the founder liked in Fraction Hop and Crystal Machine. Each station is a small reveal, and the yard's gate is the payoff, or the train stalls right where the plan went wrong.
- **Changed from the prototype:** a bird's-eye view of a train going around a loop, instead of a side view running left to right (founder's idea).
- **What was hard:** big Grade 5 numbers with hard regrouping, even for the founder without pen and paper. Settled by capping hard regrouping at one lap per play (see Tiers), and by the shell's planned **notebook** (`.scratch/notebook/spec.md`), a scratch-work drawer for every game. Cargo Line works without it.
- **Rejected: Lift Bridge** (`lab/lift-bridge`, archived). Balance a counterweight bucket against a vehicle on a tipping bridge. "Too confusing, too much to explain and understand before they can start playing with vans and trucks."
- **Rejected: Belt Factory** (`lab/belt-factory`, archived). Flip levers to route hoppers of parts into two bins that need exact amounts. Too hard, and too narrow in what it could teach: it only adds.
- **Never reuse:** Plank Bridge (cutting planks to fill bridge gaps), rejected as "not fun, bad concept".

## Concept

Solving addition and subtraction problems where the missing number can be the end, the change or the start, and doing the sums, regrouping included. Grades 3–5: whole numbers to 1000 (Grade 3), to 10 000 and tenths (Grade 4), to 100 000 and hundredths (Grade 5).

## Mechanic

The screen is a bird's-eye view of a toy countryside. A loop of track, with chevrons showing which way the train goes, runs around a green field. At the bottom of the loop is the **yard**, with a gate. Around the loop are one or two **stations** (the farm, the mill, the quarry). The student's avatar drives the engine, which pulls one wagon with its load written just above it.

Each **lap** is one task, and it's told by signs:

- At the yard, a **leaving** sign on the way out (a train, with an arrow leading out of a little yard) says what the train leaves with, and a **returning** sign on the way in (a train, with an arrow leading into a little yard) says what it must come back with.
- Each station is its sign, just inside the track: its building, a **+** or **−** and a number, on green for a **loading** sign and blue for an **unloading** sign. A chunky arrow between the sign and the track shows the way the crates go: onto the train, or off it. Red is kept for what went wrong.
- **One sign is missing its number:** it's outlined in dashes and glows, with a **?**.

The voice tells the lap as a story, and the caption shows the same words: "The train leaves with some crates. It drops off 136 crates at the farm. It must come back with 251 crates. How many should it leave with?"

1. **Type the missing number** on the number pad beside the loop. It appears on the glowing sign as you type.
2. **Press Go.** The first Go of a play says what's being tested: "Let's test your number. If it's right, the gate opens." (unless the tutorial has just shown it). The train leaves the yard with its load and drives the loop, and the **trip's sum** builds up in the middle of the field. At each station it stops with its wagon beside the sign. On the first try at a lap the voice says the station ("It picks up 293 crates at the mill."); a retry just runs. Then crates cross between the station and the wagon, the amount pops up big over the sign (+293), the sum grows (225 + 293), and the wagon's number ticks up or down. Back at the shut gate, the train waits while the yard's returning sign is highlighted: that's the check.
3. **Where it ends:**
   - **It comes back with the yard's number.** The gate opens, the train rolls in, and the lap is done. When the student typed what comes back, the train must bring exactly that, and the sum shows its result (225 + 293 = 518).
   - **It stalls.** At an unloading station, when the train has less on board than the sign says to drop off, it shudders to a stop. The station's sign turns red, and the voice says "The train only has 115 crates. It can't drop off that many."
   - **It comes back with a different number.** The gate stays shut, the yard's sign turns red, and the voice says "The train came back with 241 crates. The yard's sign says 251." When the student typed what comes back, the wagon shows no number during the run, the sum ends in ? (225 + 293 = ?), and the voice only says "Your number is too big." or "Your number is too small.", so the answer can't be copied from a wrong run.

   After a stall or a different number, the student changes the number and presses Go again, as often as they like.

**Why getting better at it is getting better at the concept:** to fill a missing start or change, the student has to see how the lap's numbers fit together, and undo the trip when the start is missing. Then they work out the sum: in their head, on paper, or in the notebook. The run checks every answer in front of them.

**What visibly fails:** a wrong idea leaves the train stalled at a station, or brings it back with the wrong load under a red sign. See Misconceptions.

## Tiers

Every tier: **6 laps per play.** The missing number moves through the lap in the same order twice: what comes back (laps 1 and 4, the easiest), what a station moves (laps 2 and 5), and what the train left with (laps 3 and 6, the hardest). On a lap whose start is missing, the first station unloads, so working the trip forwards shows.

Whole-number laps carry **crates**, and decimal laps carry **tonnes**. Every amount on a lap (the start, each station's amount, every load along the way and the end) stays within the tier's range. Station amounts have a non-zero last digit, so most sums need a trade.

**Regrouping:** on laps 1–3 each sum the lap needs has at most one trade. On laps 4–6 it can have two. Only Grade 5's lap 5 can be hard: a trade across zeros (50 000 − 1 250) or more than two trades in one sum. All other Grade 5 sums are friendly enough for mental strategies (29 998 + 4 502).

### g3: Grade 3

- Expectations: `math-2020.g3.B2.5`
- Laps: one station, whole numbers to 1000, e.g. "Leaves with ?, drops off 136 at the farm, comes back with 251."

### g4: Grade 4

- Expectations: `math-2020.g4.B2.4`
- Laps 1–3: one station. Laps 4–6: two stations.
- Laps 3 and 6 in tenths of a tonne, to 99.9, sometimes mixing a whole number and tenths (15 and 2.4). The others whole numbers to 10 000.

### g5: Grade 5

- Expectations: `math-2020.g5.B2.4`
- Laps: two stations.
- Laps 2, 4 and 6 in hundredths of a tonne, to 99.99, mixing lengths (2.18 and 0.4). Laps 1, 3 and 5 whole numbers to 100 000. Lap 5 is the one hard lap.

## Misconceptions

A misconception is spotted only on a miss (a stall or a different number). Each is matched by working out what the wrong idea would have produced on this lap and comparing it with the typed number. The **steps** of a lap are the sums its answer takes, in order: forwards from the start when the end is missing, from the start to the missing station and back from the end to it when a change is missing, and backwards from the end, undoing each station, when the start is missing. Each step adds or subtracts two amounts.

### `undoes-the-trip-wrong-way`

- The wrong idea: to find the start, do what the stations did to the end instead of undoing it.
- In play: the train drops off 136 and comes back with 251. The student types 251 − 136 = 115. The train leaves with 115 and stalls at the farm.
- Pattern: a lap whose start is missing, where the typed number is the end with every station's change applied as written (unloads taken away, loads added).
- Expectations: `math-2020.g3.B2.5`, `math-2020.g4.B2.4`, `math-2020.g5.B2.4`

### `adds-the-amounts-given`

- The wrong idea: when what changed is missing, add the two amounts you're given.
- In play: the train leaves with 452 and must come back with 315. The student types 452 + 315 = 767 for the mill to unload. The train has 452 on board, so it stalls at the mill.
- Pattern: a lap whose change is missing, where the typed number is the load just before that station plus the load needed just after it.
- Expectations: `math-2020.g3.B2.5`, `math-2020.g4.B2.4`, `math-2020.g5.B2.4`

### `smaller-digit-from-larger`

- The wrong idea: in each column, take the smaller digit from the bigger one, whichever number it's in, instead of regrouping.
- In play: 452 − 137 worked out as 325. The train comes back with the wrong load.
- Pattern: the typed number is the answer with one subtraction step done this way.
- Expectations: `math-2020.g3.B2.5`, `math-2020.g4.B2.4`, `math-2020.g5.B2.4`

### `forgets-the-carried-ten`

- The wrong idea: when a column makes ten or more, write the ones and drop the ten that should carry.
- In play: 348 + 75 worked out as 313. The train comes back with the wrong load.
- Pattern: the typed number is the answer with one addition step done this way.
- Expectations: `math-2020.g3.B2.5`, `math-2020.g4.B2.4`, `math-2020.g5.B2.4`

### `lines-up-last-digits`

- The wrong idea: line up numbers by their last digits instead of their decimal points.
- In play: 2.18 − 0.4 worked out as 2.14 (218 − 4, with the point put back). The train comes back with the wrong load.
- Pattern: a step with two amounts of different decimal lengths (a whole number counts as none), worked with the digits lined up from the right and the decimal point placed as in the longer amount.
- Expectations: `math-2020.g4.B2.4`, `math-2020.g5.B2.4`

If a typed number matches more than one, the first in this list wins. Any other miss has no misconception.

## Attempts

- One task is: one lap, from its arrival until the train comes back with the yard's number.
- One try, recorded as one attempt as it happens: **each press of Go.** Go is disabled until a number is typed. There are no exploring tries: every number on a lap is fixed except the missing one, so there's nothing to probe (founder's call).
- Success means: the train finished the lap and came back with the yard's number (or, when that's the missing one, exactly what the student typed).
- A stall is a miss. A Go with the same number as the try before is a miss: it climbs the help ladder but never adds a misconception match.
- Expectation: the tier's one expectation.
- Retries of the same task are recognised by: the task ID `lap-<n>`, n = 1–6 in the play.
- `assisted` on each attempt: the help that was on before that try. Absent (on their own), `hint` (the trip picture) or `demonstration` (after the work-it-out replay). `guided` is never used.
- Misconception: at most one per task, on the first miss that matches.
- Leaving mid-lap keeps that lap's tries so far.
- Logged locally only (for tuning, never sent): misses per lap, stalls per lap, and the help reached.

**What the teacher sees for each task and try.** Plain text, built from the rules' state. Numbers of 10 000 or more are written with a space (57 903). The unit comes once, after the first amount.

| Field | When | Text |
| --- | --- | --- |
| `asked` | Every try at a lap | `Left with ? crates, dropped off 136 at the farm, came back with 251.` |
| `asked` | Two stations, end missing | `Left with 57 903 crates, dropped off 28 542 at the farm, picked up 5032 at the mill, came back with ?.` |
| `asked` | Decimal lap | `Left with 2.18 tonnes, dropped off ? at the quarry, came back with 1.78.` |
| `detail` | A stall | `Typed 115: stalled at the farm with 115 on board.` |
| `detail` | A different number | `Typed 377: came back with 241.` |
| `detail` | Made it | `Typed 387: came back with 251.` |
| `detail` | The same number as the try before | `Typed 115 again: stalled at the farm with 115 on board.` |

The longest `asked` (Grade 5, two stations, six-digit amounts) stays under 120 characters.

The thresholds (2 misses for the trip picture, 4 for the replay, 1 match per misconception) are starting numbers, to tune from real play.

## Effort

Retrying is the loop itself: a run costs nothing, the lap stays as it was after a miss, and the red sign shows where it went wrong.

**The help ladder**, one lap at a time, reset at the next lap:

1. **The hint button** is always there. It starts to glow after **2 misses**, with the ghost hand gliding to it while the voice offers a hint. Tapping it turns on **the trip picture** (`hint`) beside the loop: two bars of the same length. The top bar is what went onto the train (what it left with, then each pickup). The bottom bar is what came off (each drop-off, then what came back). Every part is labelled with its sign's number, and the missing one with ?. For "dropped off 136, came back with 251", the top bar is one part, ?, and the bottom bar is 136 and 251, so the student can see the two parts make up the start.
2. After **4 misses** in all, whatever help was taken, **"Let's work it out together"** (`demonstration`) starts by itself. The replay works each step of the lap in place-value crates, one column at a time from the smallest place: for 251 + 136, the ones, then the tens, then the hundreds. Wherever a column trades, you watch it: ten crates combine into one of the next place up, or one opens into ten of the place below. It ends with the answer on the wagon's roof. The student types it and presses Go. Visuals carry the replay. The voice names each step ("Add the ones.").

Once help is on, it stays on until the end of that lap.

**Discouraging spamming** without a score: misses climb the help ladder, so a guesser reaches the replay quickly, and their attempts say so. No combos, coins, points or streaks: rewards follow effort and are the platform's to compute (DESIGN.md principle 5).

## Avatar

`character`: the student's avatar drives the engine. From above you see their head and shoulders in the cab, drawn through the `driver` art slot. They wave as the train leaves the yard. The portrait in the corner carries the expressions, since the driver is too small to read a face:

- `thinking`: while the student types,
- `happy`: at each station the train gets past,
- `encouraging`: after a stall or a wrong load,
- `cheering`: when the gate opens, and at the end of the play,
- `neutral` otherwise.

## Touch, reading and sound

- **Touch only, tap only:** pad keys, Go, hint and skip. No dragging. Every tap target is at least **64 px**.
- **No reading:** signs tell the lap in pictures: arrows out of and into the yard, arrows onto and off the train at stations, + and − beside their numbers, a glowing ? on the missing one. The only text a student needs is numerals and the sum's + − =. Every instruction is a caption and a voice line from the same string, and the lap's story is spoken when it arrives and can be heard again.
- **No sound needed:** every result is on screen: the stalled train and its red station sign, the red yard sign with the wagon's number and the trip's sum, or the gate opening. Without sound, the +/− on the signs, the crates, the sum and the highlighted yard sign show what each stop did and what's being checked.
- **Numbers are spoken from the number family** (see Strings), and captions show numerals as on screen (57 903, 2.18), never words.
- **The game always fits the screen,** with no scrolling or zooming, at 1366 × 650 and 1280 × 650 and larger: the loop, both yard signs, two stations, the pad, Go and hint. The browser tour checks this.
- **Progress:** a progression-based game (`progress` in the manifest): the shell's thin bar shows laps done, from 0/6 to 6/6.
- **The notebook** (once the shell has one): the game hands it a small strip of the lap's signs as the problem picture, and marks each lap's start so it clears. Nothing here depends on it.

## Tutorial

A scripted, in-code demonstration on the student's first play of Cargo Line only, in any class and at any tier (the shell's `firstPlay`), before lap 1. A skip button ends it at any time. Nothing in it is recorded, and it's never counted as help. The voice speaks first, then the hand acts, never both at once: each step waits for `say` to settle.

1. "Welcome to Cargo Line!" A lap: leaves with 5 crates, picks up 3 at the farm, comes back with ?. "The signs tell the train's trip."
2. "One sign is missing its number. Type it on the number pad." The hand taps 9, a wrong number on purpose.
3. "Then press Go to test your number. If it's right, the gate opens." The hand presses Go. "It picks up 3 crates at the farm." The sum builds to 5 + 3 = ?, the gate stays shut, and the yard's sign turns red. "Your number is too big."
4. "The gate stayed shut. So change your number and press Go again." The hand deletes the 9, taps 8 and presses Go. The sum reads 5 + 3 = 8, the wagon shows 8, and the gate opens. "It made it! The gate opens."
5. "Now it's your turn!" Lap 1 begins.

## Strings

Every string a student sees or hears. Each one also becomes a voice line. Sentences are whole strings, and numbers are fragments joined by `say(...ids)`. `title` is the game's name, as home shows and says it.

| ID | English |
| --- | --- |
| `title` | Cargo Line |
| `tutorial.welcome` | Welcome to Cargo Line! |
| `tutorial.signs` | The signs tell the train's trip. |
| `tutorial.missing` | One sign is missing its number. Type it on the number pad. |
| `tutorial.go` | Then press Go to test your number. If it's right, the gate opens. |
| `tutorial.try-again` | The gate stayed shut. So change your number and press Go again. |
| `tutorial.your-turn` | Now it's your turn! |
| `ui.go` | Go |
| `ui.hint` | Hint |
| `ui.skip` | Skip |
| `story.leaves` | The train leaves with |
| `story.leaves-some` | The train leaves with some |
| `story.picks-up` | It picks up |
| `story.picks-up-some` | It picks up some |
| `story.drops-off` | It drops off |
| `story.drops-off-some` | It drops off some |
| `story.back` | It must come back with |
| `unit.crates` | crates |
| `unit.crates-end` | crates. |
| `unit.tonnes` | tonnes |
| `unit.tonnes-end` | tonnes. |
| `at.farm` | at the farm. |
| `at.mill` | at the mill. |
| `at.quarry` | at the quarry. |
| `ask.leaves` | How many should it leave with? |
| `ask.picks-up` | How many does it pick up there? |
| `ask.drops-off` | How many does it drop off there? |
| `ask.back-crates` | How many crates will it come back with? |
| `ask.back-tonnes` | How many tonnes will it come back with? |
| `run.stakes` | Let's test your number. If it's right, the gate opens. |
| `run.only-has` | The train only has |
| `run.cant-drop` | It can't drop off that many. |
| `run.came-back` | The train came back with |
| `run.sign-says` | The yard's sign says |
| `run.too-big` | Your number is too big. |
| `run.too-small` | Your number is too small. |
| `run.solved` | It made it! The gate opens. |
| `lap.next` | Here's the next trip. |
| `play.done` | You finished every trip. Great work! |
| `hint.ready` | Want a hint? Tap the hint button. |
| `help.picture` | The top bar is what went onto the train. The bottom bar is what came off. They're the same. |
| `demo.start` | Let's work it out together. |
| `demo.add.0` … `demo.add.4` | Add the ones. / Add the tens. / Add the hundreds. / Add the thousands. / Add the ten thousands. |
| `demo.take.0` … `demo.take.4` | Take away the ones. / Take away the tens. / Take away the hundreds. / Take away the thousands. / Take away the ten thousands. |
| `demo.add-tenths`, `demo.add-hundredths` | Add the tenths. / Add the hundredths. |
| `demo.take-tenths`, `demo.take-hundredths` | Take away the tenths. / Take away the hundredths. |
| `demo.carry` | That's ten or more, so ten of them make one of the next place. |
| `demo.trade` | Not enough here, so open one from the next place. |
| `demo.answer` | So the answer is |
| `demo.your-turn` | Now type it in and press Go. |
| `num.1` … `num.99` | The number family: "one" to "ninety-nine", shared with Crystal Machine. |
| `num.zero` | zero |
| `num.hundred` | hundred |
| `num.thousand` | thousand |
| `num.million` | million |
| `num.point` | point |

How they combine:

- A lap arrives, as one `say(...)`: "The train leaves with some crates. It drops off 136 crates at the farm. It must come back with 251 crates. How many should it leave with?" is `story.leaves-some unit.crates-end · story.drops-off num.1 num.hundred num.36 unit.crates at.farm · story.back num.2 num.hundred num.51 unit.crates-end · ask.leaves`.
- A stall: `say("run.only-has", "num.1", "num.hundred", "num.15", "unit.crates-end", "run.cant-drop")`.
- A wrong load: `say("run.came-back", …, "unit.crates-end", "run.sign-says", …)`. With what comes back missing: `say("run.too-big")` or `say("run.too-small")`.
- A station, on a lap's first try: `say("story.picks-up", "num.2", "num.hundred", "num.93", "unit.crates", "at.mill")`, with its crates moving once it's been said.

**Every number spoken is in the family.** Whole numbers are said as `num.<1–99>`, `num.hundred`, `num.thousand` and `num.million` in English order (57 903 is "fifty-seven" "thousand" "nine" "hundred" "three"). Decimals are the whole part, then `num.point`, then each digit as `num.<1–9>` or `num.zero` ("two" "point" "one" "eight"), with `num.zero` for a whole part of 0. The pad takes at most 4 digits at Grade 3, 5 at Grade 4 and 6 at Grade 5, plus one or two decimal places on decimal laps. So the biggest number spoken (a typed start plus two pickups at Grade 5) is under 1 200 000.

Captions show numerals where a number is spoken, written as on screen (57 903, 2.18).

## Art

A toy countryside from above: soft greens, a warm wooden train, chunky signs. Readable at a glance and nothing like a coin or a score. Placeholder SVG first, from the style kit, each in a fixed frame with an anchor.

| Slot | What it shows |
| --- | --- |
| `field` | The green field inside and around the loop |
| `track` | The loop of track, drawn from a path the train follows |
| `yard` | The freight yard at the bottom of the loop |
| `gate` | The yard's gate, shut and open |
| `station-farm`, `station-mill`, `station-quarry` | Each station's building, on its sign: a red barn, a windmill, a pile of rock |
| `sign-leaves`, `sign-back` | The yard's signs: a train, with an arrow leading out of a little yard, and into it |
| `sign-load`, `sign-unload` | A station's sign: green for a pickup, blue for a drop-off |
| `arrow-load`, `arrow-unload` | The chunky arrow between a station's sign and the track |
| `sign-missing` | The dashed, glowing outline and ? of the missing number |
| `sign-wrong` | The red state of a sign where the train stalled or came back wrong |
| `engine` | The engine from above, with an open cab |
| `driver` | The avatar in the cab (the portrait for now), anchored at its base |
| `wagon` | The wagon with crates on it, and its load's number just above |
| `crate-0` … `crate-4` | The replay's place-value crates: one, ten, hundred, thousand, ten thousand |
| `crate-tenth`, `crate-hundredth` | The replay's crates for tenths and hundredths |
| `trip-bar` | The trip picture's two bars and their labelled parts |

## Teacher card

- Teaches: solving addition and subtraction problems when the missing number is the end, the change or the start, and doing the sums with regrouping.
- Grades and tiers: Grades 3–5, a tier per grade.
- Expectations:
  - `math-2020.g3.B2.5`: Solves story problems that add or subtract whole numbers with totals up to 1000, whether the unknown is the result, the change or the start, using tools, models and written methods.
  - `math-2020.g4.B2.4`: Solves story problems that add or subtract whole numbers with totals up to 10 000, and decimals in tenths, choosing tools and strategies, the column method included.
  - `math-2020.g5.B2.4`: Solves story problems that add or subtract whole numbers with totals up to 100 000, and decimals to hundredths, choosing tools and strategies, the column method included.
- The mechanic in 30 seconds: a train runs a loop from the yard past one or two stations that load or unload cargo. One number on the trip is missing: what it leaves with, what a station moves, or what comes back. The student types it and presses Go, and the train either comes back with the yard's number, stalls at a station, or comes back with the wrong load.
- Misconceptions it reveals (each shown on the dashboard as its sentence, with only the wrong working as the example; see `.scratch/misconception-examples/spec.md`):
  - `undoes-the-trip-wrong-way`: "Undoes the trip the wrong way round (e.g. a train dropped off 136 and came back with 251: left with 251 − 136 = 115)." Reteach: act it out with counters. Start with a pile, take 136 away, leave 251, then ask how to get back to the start.
  - `adds-the-amounts-given`: "Adds the two amounts given to find the change (e.g. a train left with 452 and came back with 315: dropped off 452 + 315 = 767)." Reteach: a bar model with the start as the whole and the end as one part. What's the other part?
  - `smaller-digit-from-larger`: "Takes the smaller digit from the bigger one instead of regrouping (e.g. 452 − 137 = 325)." Reteach: base ten blocks for 452. Can you take 7 ones from 2 ones? Trade a ten first.
  - `forgets-the-carried-ten`: "Forgets the regrouped ten (e.g. 348 + 75 = 313)." Reteach: base ten blocks. Thirteen ones make a ten and three ones; where does that ten go?
  - `lines-up-last-digits`: "Lines up the last digits instead of the decimal points (e.g. 2.18 − 0.4 = 2.14)." Reteach: write 0.4 as 0.40 under 2.18, or show both on a metre stick.
  - In results, e.g. "4 students undid the trip the wrong way round".
- When to use it: after the class has met story problems where the start or the change is missing, not just the answer, and has practised the column method with regrouping. At Grades 4 and 5, after decimals have been taught: 2 of the 6 laps use tenths at Grade 4, and 3 of the 6 use hundredths at Grade 5. Good for a 10–15 minute centre, or as a follow-up to a lesson on "how many did it start with?" problems.

## Open questions

- The bird's-eye loop, the trip picture and the work-it-out replay weren't prototyped: the lab prototype is a side view. The founder approved the spec without playing them (2026-11-01), so `build-game` should get the founder's verdict on them early, at the first playable.
- The examples on the dashboard depend on `.scratch/misconception-examples/spec.md`. Until it lands, each misconception's `description` carries its example after "e.g." as above.
