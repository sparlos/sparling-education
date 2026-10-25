# Skill retro

The last step of every Kindling game skill (`design-game`, `build-game`, `polish-game`, `review-game`, `add-curriculum`, `make-video`). The skill improves itself from each run, so the next run needs less back-and-forth with the human.

## 1. List the friction

First ask the human: "Anything I could have done better, or anything you noticed but didn't mention?" Wait for their answer before you list your own. Each thing they raise is a friction point.

Then go back through the run and list every other **friction point**: each time the human corrected you, answered a question the skill's files could have answered, rejected a draft, or pointed you to something you missed. Count the steps you redid and the guesses you had to back out too.

Done when the human has answered, and every friction point from their answer and the run is listed, each with what happened in one line.

## 2. Sort each one

For each friction point, decide which it is:

- **Avoidable**: a line in the skill, its template or a doc it loads would have prevented it. Examples: a convention the human had to explain, a check that would have caught the mistake earlier, a question better asked up front, a step in the wrong order.
- **Judgement**: a decision that belongs to the human and depends on this run, like a pedagogy call for this game or a taste choice. Leave these out of the skill.

Also list any line of the skill that was stale, wrong, or changed nothing about what you did. Those are candidates for removal.

Done when every friction point is sorted as avoidable or judgement.

## 3. Propose the edits

For each avoidable point, write the smallest edit that would have prevented it: the file, the exact text to add or change, and the friction point it answers. Put each edit where it would have been read at the right moment. Change a line that already exists rather than adding a new one beside it. Propose removing the stale lines too. If the fix belongs in a shared doc (`docs/DESIGN.md`, the game contract, this file), propose it there so every skill benefits.

Show the human the list of friction points, how you sorted them, and the proposed edits. Apply the ones they approve and nothing else.

Done when the human has accepted or declined each proposed edit, and every accepted edit is applied. If the run had no avoidable friction, say so in one line.
