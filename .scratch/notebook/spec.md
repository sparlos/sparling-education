# Notebook: a scratch-work drawer in the play shell

Status: needs-triage

Raised 2026-11-01 while designing the addition and subtraction game (Cargo Line). Not designed yet: this records the idea and what's already settled, for its own design pass.

## The problem

Some tasks need working out. Grade 5 sums run to 100 000 and decimals to hundredths, and hard regrouping trips up even adults without pen and paper. The curriculum asks students to solve with "appropriate tools, strategies, and algorithms", but no game gives them anywhere to work. A student should never *have* to reach for paper. Paper stays fine for those who want it.

## The idea

A drawer that slides out over any game, owned by the play shell (like voice), so every game gets it for free. It's like Prodigy's slide-out manipulatives beside a question.

## Settled with the founder

- **Shell-owned, available in all games.** It's an overlay, not part of any one game.
- **It shows the problem.** The student never switches back and forth between the game and the notebook. The game hands the shell a small picture of the current task, drawn by the game itself (for Cargo Line, a mini strip of the route's signs), so it works for Grades 1–3 without reading.
- **It clears between tasks.** The game tells the shell when a new task starts.
- **Optional.** No game may depend on it to be playable. Cargo Line works without it.

## Leanings, not decided

- Using it is scratch paper, not help. It never sets `assisted`, and it never lowers understanding.
- Nothing drawn is saved or shown to anyone (principle 7).
- First tools: a pen (finger or stylus) for written methods like the column algorithm, base-ten blocks you can break and group, and an open number line. More later (fraction strips, counters, arrays).

## Open questions

- The contract change: how a game supplies the problem picture and marks a task's start. (Is it a component prop on `defineGame`? A call like `onTask`? Can it reuse `onProgress`?)
- Which tools ship first, and how each works by touch within the Chromebook budgets (shell JavaScript, 30 fps while dragging).
- Whether a game can turn it off, or limit its tools (e.g. where the tool would do the game's job for the student).
- Where the drawer opens from, and how it sits beside a game at 1366 × 650 without covering what the student needs to see.
- Whether teachers should see that a student used it.
