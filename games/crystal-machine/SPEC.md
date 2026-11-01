# Crystal Machine

Status: approved
Slug: crystal-machine (game link: /play/crystal-machine)
Version: 1
Renderer: dom
Avatar: character

## Why it's fun

The founder played two prototypes in the lab on 2026-10-31 and picked **Ten Machine** (`apps/play/src/lab/ten-machine`), renamed Crystal Machine.

- **What hooked them:** "very fun", "the core concept is great". The loop is set up, then pay off: choose how many crystals each chute drops, press Run, and watch every ten fuse into one bigger crystal, in chain reactions through the tubes. It's the same plan-then-watch loop as Fraction Hop, which the founder also liked, with the chain-reaction payoff of merge games like 2048 and Suika (the merge genre was the founder's pick for place value).
- **Puzzling is fine; confusing isn't.** A hard job is welcome, as long as it's obvious what to do.
- **What it still needs:** an art direction beyond columns moving into each other. Settled here: a crystal workshop (see Art). The polish pass does the rest.
- **Rejected: Bundle Crate** (`lab/bundle-crate`, archived). The student dragged chains of ten blocks to merge them, held a block to smash it, and filled a crate to an order like "606 in 12 blocks". "It was just confusing on what I was actually supposed to do." Merging was interesting; breaking blocks apart was weird. Crystal Machine was "way easier to grasp more quickly".
- **Never reuse:** Plank Bridge (cutting planks to fill bridge gaps), rejected as "not fun, bad concept".

## Concept

Place value: a digit's value comes from its place, ten of one unit make one of the next, and a number can be built from its units in more than one way. Grades 3–5: numbers up to 1000 (Grade 3), 10 000 (Grade 4) and 100 000 (Grade 5).

## Mechanic

The screen is a crystal machine, run by the student's avatar. Across it, from left to right like a written number, is one **chute** and **tube** per place: hundreds, tens and ones at Grade 3, plus thousands at Grade 4, plus ten thousands at Grade 5. To the left of these is one more tube, for the next place up, with no chute. It only catches crystals that fuse into it. Each place has its own **crystal** in base ten shapes: a small cube (one), a rod of ten, a flat of a hundred, a big cube of a thousand and a long block of ten thousand (a hundred thousand for the extra tube at Grade 5). Under each tube is a **window** showing the digit it holds. Read left to right, the windows show the number the machine made.

1. **A job arrives:** a number and how many crystals to make it with, e.g. "Make 607 with 13 crystals." The crystal count is always the fewest that can make the number with the chutes that are open, so every job has exactly one answer. Some jobs **close** one or two chutes, shown with a lock: "Make 160 with 16 crystals. The hundreds chute is closed." The answer is then 16 tens.
2. **Set the counts.** Tap a chute to choose it (it lights up, and its place is spoken), then type its count on the **number pad** beside the machine: 0–9 and delete, up to 3 digits per chute. At the start of a job, the biggest open chute is chosen. A closed chute can't be chosen. The **crystal counter** shows the crystals in the plan against the job's count ("13 / 13") as the student types, and turns red when the plan has too many.
3. **Press Run.**
   - **Too many crystals:** the machine doesn't start. The counter flashes and the voice says "That's too many crystals. This job has 16 crystals." This is a reminder of the job's rule, not a try (founder's call: a plan that adds up correctly mustn't be marked wrong for breaking a rule of the game).
   - **No crystals:** the machine doesn't start, and the voice says how to set a chute.
   - **Otherwise the machine runs.** The avatar pulls the lever. Crystals drop from each chute into its tube, biggest first. When a tube reaches ten, the ten flash and **fuse** into one crystal of the next place, which flies into the tube to its left, and can set off the next fuse there. The drops speed up for big counts, so a run lasts a few seconds at most.
4. **The windows read the number made.** If it's the job's number, the job is done. Otherwise the voice says "The machine made 67. The job is 607." Windows whose digit differs from the job's turn red. The plan stays as it was, so the student changes a count and runs again, as often as they like.

**Why getting better at it is getting better at the concept:** a student who knows each digit's place sets 607 as 6 hundreds, 0 tens and 7 ones. A student who can trade a place down sees that 160 with the hundreds closed is 16 tens. The fusing shows every run that ten of a unit is one of the next.

**What visibly fails:** a wrong idea makes a wrong number in the windows, beside the job's number, with the wrong places in red. See Misconceptions.

## Tiers

Every tier: 6 jobs per play. Open jobs come first, so the student learns the machine before chutes close. The job's number never starts with zero. With one chute closed, its own digit is never 0, so the job always needs a trade. With two closed (Grade 5, job 6), the lower one's digit can be 0, as in 10 620: the top one's never is, so a trade is still needed (founder's call). The **crystal count** is the sum of the open chutes' counts in the one answer: the digits of the open places, with each closed place's digit carried down into the next open chute below it as tens (e.g. 8621 with the thousands closed: 86 hundreds, 2 tens and 1 one, so 89 crystals).

**Every run fits the windows.** A job is only picked if its crystal count, all spent on its biggest open chute, makes less than ten of the extra tube's place: under 10 000 at Grade 3, 100 000 at Grade 4 and 1 000 000 at Grade 5. So every window, the extra tube's included, shows one digit after any run the machine starts. In practice this caps the crystal count at 99 when the chute just below the extra tube is open alongside a closed chute (Grade 3 job 6, Grade 4 jobs 5–6, Grade 5 job 5).

### g3: Grade 3

- Expectations: `math-2020.g3.B1.5` (jobs 1–3), `math-2020.g3.B1.1` (jobs 4–6)
- Jobs 1–3, all chutes open: three-digit numbers with exactly one zero, in the tens or ones place (607, 580). Evidence that a digit's value comes from its place, and that a zero holds one.
- Jobs 4–5, hundreds closed: three-digit numbers made from tens and ones (160 as 16 tens; 347 as 34 tens and 7 ones).
- Job 6, tens closed: three-digit numbers made from hundreds and ones (347 as 3 hundreds and 47 ones).

### g4: Grade 4

- Expectations: `math-2020.g4.B1.1`
- Jobs 1–2, all chutes open: four-digit numbers with exactly one zero, not in the thousands place (6707, 8061).
- Jobs 3–4, thousands closed: e.g. 8621 as 86 hundreds, 2 tens and 1 one.
- Jobs 5–6, hundreds closed: e.g. 8621 as 8 thousands, 62 tens and 1 one.

### g5: Grade 5

- Expectations: `math-2020.g5.B1.1`
- Jobs 1–2, all chutes open: five-digit numbers with one or two zeros, not in the ten thousands place (30 038, 84 620).
- Jobs 3–4, ten thousands closed: e.g. 52 539 as 52 thousands, 5 hundreds, 3 tens and 9 ones.
- Job 5, thousands closed: e.g. 84 352 as 8 ten thousands, 43 hundreds, 5 tens and 2 ones.
- Job 6, ten thousands and thousands closed: e.g. 10 620 as 106 hundreds, 2 tens and 0 ones (108 crystals). The hundreds count is the number's first three digits (100–999).

Every count an answer needs fits the pad's 3 digits, and at Grades 3 and 4 it never goes past 99.

## Misconceptions

A misconception is spotted only on a run that makes the wrong number (a **miss**, see Attempts), never on a refused Run.

### `copies-the-digit`

- The wrong idea: when a place's chute is closed, copy the other digits as written, instead of trading the closed place into smaller units.
- In play: for 160 with the hundreds closed, the student sets 6 tens and 0 ones. The machine makes 60. The hundreds window stays empty, under the 1 they needed. The plan uses fewer crystals than the job's count, so it runs.
- Pattern: a job with a closed chute, where every open chute is set to the job's own digit in that place. Recorded after **1** match in a job.
- Expectations: `math-2020.g3.B1.1`, `math-2020.g4.B1.1`, `math-2020.g5.B1.1`

### `zero-not-a-place`

- The wrong idea: a zero is nothing, so it can be left out, and the digits after it slide into the wrong places.
- In play: for 607, the student sets 6 tens and 7 ones. The machine makes 67, and the hundreds window is empty. The plan has exactly the job's 13 crystals, so it runs.
- Pattern: a job with all chutes open and a zero in its number, where the number made is the job's number with its zeros left out (607 → 67, 580 → 58, 30 038 → 338). Recorded after **1** match.
- Expectations: `math-2020.g3.B1.5`, `math-2020.g4.B1.1`, `math-2020.g5.B1.1`

**Dropped: `whole-number-as-count`.** Putting the whole number in one chute (160 tens for 160) was in the prototype, where it made 1600. With the crystal count, such a plan always has too many crystals, so it never runs and never makes a number. Refused Runs are reminders, not tries (founder's call), so the game has no fair way to see this mistake. Refused Runs are logged locally for tuning. If they turn out common, reconsider.

## Attempts

- One task is: one job, from its arrival until the machine makes its number.
- One try, recorded as one attempt as it happens: **each Run that starts the machine.** A refused Run (too many crystals, or none) is not a try and sends nothing. There are no exploring tries: every run makes a whole number, so every run is a real try (founder's call).
- Success means: the machine made the job's number. That only happens with the job's crystal count, since it's the fewest that can make the number.
- A run of the very same plan as the run before it, in the same job, is a miss: it climbs the help ladder but never adds a misconception match.
- Expectation: Grade 3, jobs 1–3 `math-2020.g3.B1.5` and jobs 4–6 `math-2020.g3.B1.1`. Grades 4 and 5: the tier's one expectation.
- Retries of the same task are recognised by: the task ID `task-<n>`, n = 1–6 in the play. Every run in a job is a try at that task.
- `assisted` on each attempt: the help that was on before that run. Absent (on their own), `hint` (hint 1 or hint 2) or `guided`. `demonstration` is never used.
- Misconception: at most one per task, on the miss that matches it first. The two patterns can't both match one run.
- Leaving mid-job keeps that job's tries so far.
- Logged locally only (for tuning, never sent): refused Runs per job, the hint level reached, and misses per job.

**What the teacher sees for each task and try.** Plain text, built from the rules' state. Numbers of 10 000 or more are written with a space (84 620). Counts are listed biggest place first, every open chute included, zeros too:

| Field | When | Text |
| --- | --- | --- |
| `asked` | Every try at a job with all chutes open | `Make 607 with 13 crystals.` |
| `asked` | One chute closed | `Make 160 with 16 crystals. Hundreds closed.` |
| `asked` | Two chutes closed | `Make 10 620 with 108 crystals. Ten thousands and thousands closed.` |
| `detail` | A miss | `Put in 6 tens and 0 ones: made 60.` |
| `detail` | Made it | `Put in 16 tens and 0 ones: made 160.` |
| `detail` | The same plan as the run before | `Ran the same crystals again: made 60.` |

The longest `detail` (Grade 5, five open chutes, three-digit counts) stays under 120 characters.

The thresholds (2, 3 and 4 misses for the help steps, 1 match per misconception) are starting numbers, to tune from real play.

## Effort

Retrying is the loop itself: a run costs nothing, and the plan stays as it was after a miss, so the student changes one count and runs again. The red windows show which places are wrong.

**The help ladder**, one job at a time, reset at the next job. Only misses count; refused Runs don't.

1. **The hint button** is always there. It starts to glow after **2 misses**, with the ghost hand gliding to it while the voice offers a hint. Tapping it turns on **hint 1**: the job's digits appear above the tubes' windows, one per place, so the student sees which tube should end up showing which digit.
2. After **3 misses** in all, on a job with a closed chute, the button glows again. Tapping it turns on **hint 2**: under each closed chute, a picture of its crystal breaking into ten crystals of the next place down, with an arrow into the open chute below. On a job with all chutes open, there is no hint 2.
3. After **4 misses** in all, whatever hints were taken, **guided** starts by itself: "Let's do it together." The game sets the biggest open chute to its answer, and the voice says what it set ("Sixteen tens."). The student sets the rest and presses Run. After each further miss, the game sets the next chute. The student always presses Run.

Once help is on, it stays on until the end of that job.

**Discouraging spamming** without a score: misses climb the help ladder, so a spammer ends up guided, and their attempts say so. No combos, coins, points or streaks: rewards follow effort and are the platform's to compute (DESIGN.md principle 5).

## Avatar

`character`: the student's portrait stands at the machine's control panel, beside a lever, drawn through the `operator` art slot so a full-body character can replace it later. On Run, the lever pulls down (the portrait leans into it).

Expressions (the contract's set):

- `thinking`: while the student sets counts,
- `happy`: when a run sets off a chain of 2 or more fuses in a row, and on each made job,
- `encouraging`: after a miss, and on a refused Run,
- `cheering`: at the end of the play,
- `neutral` otherwise.

## Touch, reading and sound

- **Touch only, tap only:** tap a chute, tap pad keys, tap Run, hint and skip. No dragging. Every tap target is at least **64 px**: each chute's whole face, each pad key, Run and hint.
- **No reading:** the only text a student needs is numerals, which are what's being taught. Chutes are marked by their crystal's shape, not by a word, and tapping one speaks its place. Closed chutes show a lock. The crystal counter is numerals and a crystal icon. Every instruction is a caption and a voice line from the same string. The job is spoken when it arrives and can be heard again.
- **No sound needed:** every result is on screen: the windows read the number made, wrong places are red, and the counter goes red with too many crystals.
- **Sound effects:** a crystal makes a sound as it lands (`crystal-drop`, with a small change of pitch each time), and ten fusing makes another as they start to pull together (`crystal-merge`). A big column sounds like a shower of crystals: up to one landing sound every 15 ms, and one fusing sound every 60 ms.
- **The game always fits the screen,** with no scrolling or zooming, at 1366 × 650 and 1280 × 650 and larger: at Grade 5, six tubes, the pad and the job. The browser tour checks this.
- **Progress:** a progression-based game (`progress` in the manifest): the shell's thin bar shows jobs done, from 0/6 to 6/6.

## Tutorial

A scripted, in-code demonstration: the avatar and a ghost hand act out two short jobs while the voice explains (strings `tutorial.*`). It plays only on the student's first play of Crystal Machine, in any class and at any tier (the shell's `firstPlay`), before job 1. A skip button ends it at any time. Nothing in it is recorded, and it's never counted as help. The voice speaks first, then the hand acts, never both at once: each step waits for `say` to settle.

1. "Welcome to the Crystal Machine!" The job: "Make 34 with 7 crystals." "The job says which number to make, and how many crystals to use."
2. "Tap a chute, then tap how many crystals it drops." The hand taps the tens chute and 3 on the pad, then the ones chute and 4. The counter reads 7 / 7.
3. "Then press Run, and watch the crystals fall." The hand presses Run. Three rods and four cubes drop, and the windows read 3 4.
4. The job: "Make 20 with 20 crystals. The tens chute is closed." The hand taps the ones chute, then 2 and 0, and presses Run. "Ten crystals fuse into one bigger crystal." The cubes drop. At ten they flash and fuse into a rod, which flies into the tens tube, and again at twenty. The windows read 2 0.
5. "Now it's your turn!" Job 1 begins.

## Strings

Every string a student sees or hears. Each one also becomes a voice line. Sentences are whole strings, and numbers are fragments joined by `say(...ids)`. `title` is the game's name, as home shows and says it.

| ID | English |
| --- | --- |
| `title` | Crystal Machine |
| `tutorial.welcome` | Welcome to the Crystal Machine! |
| `tutorial.job` | The job says which number to make, and how many crystals to use. |
| `tutorial.set` | Tap a chute, then tap how many crystals it drops. |
| `tutorial.run` | Then press Run, and watch the crystals fall. |
| `tutorial.fuse` | Ten crystals fuse into one bigger crystal. |
| `tutorial.your-turn` | Now it's your turn! |
| `ui.run` | Run |
| `ui.hint` | Hint |
| `ui.skip` | Skip |
| `job.make` | Make |
| `job.with` | with |
| `job.crystals` | crystals. |
| `closed.1` | The tens chute is closed. |
| `closed.2` | The hundreds chute is closed. |
| `closed.3` | The thousands chute is closed. |
| `closed.4` | The ten thousands chute is closed. |
| `closed.4-3` | The ten thousands and thousands chutes are closed. |
| `place.0` … `place.4` | Ones, Tens, Hundreds, Thousands, Ten thousands (spoken when a chute is tapped) |
| `chute.closed` | That chute is closed. |
| `run.empty` | Tap a chute, then tap how many crystals it drops. |
| `run.too-many` | That's too many crystals. |
| `run.job-has` | This job has |
| `run.made` | The machine made |
| `run.job-is` | The job is |
| `run.solved` | Job done! |
| `job.next` | Here's the next job. |
| `play.done` | You did every job. Great work! |
| `hint.ready` | Want a hint? Tap the hint button. |
| `hint.ready-again` | Want another hint? Tap the hint button again. |
| `hint.digits` | Now each tube shows the digit it should end up with. |
| `hint.trade` | A closed chute's crystal can come in as ten smaller crystals, down the next chute. |
| `guided.start` | Let's do it together. |
| `guided.first` | I'll set the first chute. You set the rest. |
| `guided.one-more` | Here's one more chute. |
| `num.1` … `num.99` | The number family: "one" to "ninety-nine" (99 strings), generated in the manifest from English number words. |
| `num.hundred` | hundred |
| `num.thousand` | thousand |

How they combine:

- Job arrives: `say("job.make", "num.6", "num.hundred", "num.7", "job.with", "num.13", "job.crystals")`, then `"closed.2"` if a chute is closed.
- A chute tapped: `say("place.1")`.
- Too many crystals: `say("run.too-many", "run.job-has", "num.16", "job.crystals")`.
- A miss: `say("run.made", "num.67", "run.job-is", "num.6", "num.hundred", "num.7")`.
- Guided sets a chute: `say("guided.first", "num.16", "place.1")`.

**Every number spoken is in the family.** Any whole number from 1 to 999 999 is said as `num.<1–99>`, `num.hundred` and `num.thousand` in English order: 84 620 is "eighty-four" "thousand" "six" "hundred" "twenty", and 106 is "one" "hundred" "six". The biggest numbers the game speaks:

- **Jobs:** at most 99 999.
- **Crystal counts:** at most 999 + 9 + 9 = 1017 (Grade 5, job 6).
- **Numbers made:** a run never has more crystals than the job's count, so by the tiers' rule (every run fits the windows) Grade 3 makes less than 10 000, Grade 4 less than 100 000 and Grade 5 less than 1 000 000.
- **Guided** speaks a count (at most 999) and a place.

Captions show numerals where a number is spoken, written as on screen (84 620), so `num.*`, `num.hundred` and `num.thousand` fragments in a caption are rendered as the whole number in numerals, not as words.

## Art

A crystal workshop: glowing, faceted crystal in the base ten shapes, on a machine of brass and glass. It fits the brand's violet gem without being the logo, and the gold sparkle stays shapes only (DESIGN.md). Placeholder SVG first, from the style kit, each in a fixed frame with an anchor.

| Slot | What it shows |
| --- | --- |
| `machine` | The machine's body behind the chutes and tubes |
| `chute` | A place's chute, open, marked with its crystal's shape |
| `chute-closed` | A closed chute, with a lock |
| `tube` | A glass tube holding up to 9 crystals |
| `window` | The digit window under a tube |
| `crystal-0` … `crystal-5` | The crystals: one (small cube), ten (rod), hundred (flat), thousand (big cube), ten thousand (long block), hundred thousand (Grade 5's extra tube only) |
| `fuse` | The flash when ten crystals fuse into one |
| `operator` | The avatar at the control panel (the portrait for now), anchored at its base |
| `lever` | The Run lever, up and down |
| `counter` | The crystal counter, with its crystal icon |
| `hint-digit` | Hint 1's digit tag above a window |
| `trade` | Hint 2's picture: one crystal breaking into ten of the next place, with an arrow |

## Teacher card

- Teaches: place value with whole numbers: a digit's value comes from its place, ten of one unit make one of the next, and a number can be built from its units in more than one way.
- Grades and tiers: Grade 3 (g3), Grade 4 (g4), Grade 5 (g5).
- Expectations:
  - `math-2020.g3.B1.1`: Reads and shows whole numbers to 1000 in many forms (words, numerals, expanded form, number lines, base ten blocks), builds them up and splits them apart in different ways, and talks about where people use numbers every day.
  - `math-2020.g3.B1.5`: Describes and shows numbers with more than one digit by what each digit is worth in its place, including with base ten blocks: the 5 in 511 is worth 500, and a zero keeps a place empty.
  - `math-2020.g4.B1.1`: Reads and shows whole numbers to 10 000 in many forms, builds them up and splits them apart in different ways (8621 as 7 thousands, 16 hundreds, 2 tens and 1 one), and talks about where people use numbers every day.
  - `math-2020.g5.B1.1`: Reads and shows whole numbers to 100 000 in many forms, expanded notation included, builds them up and splits them apart in different ways (10 620 as 106 hundreds and 20 ones), and talks about where people use numbers every day.
- The mechanic in 30 seconds: students make a number by choosing how many crystals each chute of a machine drops, then run it. Every ten crystals fuse into one of the next size, and the machine's windows show the number made. Each job says how many crystals to use, so there's one right way to make it, and some jobs close a chute, so students have to trade that place into smaller units.
- Results: per expectation, each job reads *on their own*, *with a hint*, *guided* or, when the student left it undone, *not yet*, plus any misconception shown along the way. The play view lists every run of every job: what it asked, then each try and what the machine made.
- Misconceptions it reveals:
  - `copies-the-digit`: "Copies the digits as written when a place can't be used, instead of trading it into smaller units (e.g. makes 160 from tens as 6 tens)." Reteach: with real blocks, trade the hundred for ten tens, then count the tens out loud.
  - `zero-not-a-place`: "Leaves out a zero, so the digits after it slide into the wrong places (e.g. builds 607 as 67)." Reteach: build both numbers with blocks, side by side, and ask what the zero is doing.
  - In results, e.g. "3 students built 607 as 67".
- When to use it: after teaching place value with base ten blocks, as practice, not a first lesson. Grade 3: once students can show numbers to 1000 in hundreds, tens and ones, and have traded a hundred for ten tens. Grade 4: when splitting numbers to 10 000 in different ways. Grade 5: the same, to 100 000.

## Simulator

`simulate` plays a whole play through the rules, as the contract requires. A simulated student's first try at a job is right with probability `accuracy`. Otherwise, a misconception they hold that the job can show gives the wrong plan (`copies-the-digit` on a closed-chute job, `zero-not-a-place` on an open job with a zero), and if none can, one count is off by one. They never press Run with too many crystals. Later tries follow the same rule, with `helpRate` deciding whether each offered hint is taken, and guided fixing chutes as in play.

## Open questions

- **Thresholds** (misses per help step, matches per misconception) are starting numbers, to tune from the locally logged counts.
- **`whole-number-as-count`** can't be seen with refused Runs as reminders (see Misconceptions). Revisit if the logged refusals are common.
- **A surprised face** for big chain reactions would suit the game, but the avatar contract has only neutral, happy, thinking, encouraging and cheering. `happy` stands in. Adding one is a change to `@repo/avatar`, for every game.
- **Art direction** beyond the crystal workshop's materials (the machine's look, motion and sound of fusing) is for `polish-game`.
