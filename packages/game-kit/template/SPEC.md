# Template Game

Status: approved
Slug: template-game (game link: /play/template-game)
Version: 1
Renderer: dom
Avatar: portrait

The starter kit's own example spec, in the `design-game` format, so the template's spec test has something to read. `pnpm new-game` never copies it: a new game keeps the SPEC.md its `design-game` session wrote. The game it describes is a placeholder that shows the kit's patterns, not a model mechanic.

## Why it's fun

It isn't: it's a template.

## Concept

The bigger the denominator, the smaller each unit piece.

## Mechanic

Two unit fractions are shown as cards. The student taps the bigger one.

## Tiers

Every tier: 3 tasks per play.

### g3: Grade 3

- Expectations: `math-2020.g3.B2.8`
- Tasks: halves to sixths.

### g4: Grade 4

- Expectations: `math-2020.g4.B1.4`
- Tasks: halves to eighths.

## Misconceptions

### `bigger-denominator-bigger`

- The wrong idea: a bigger bottom number means a bigger fraction.
- In play: tapping the card with the bigger denominator; its bar is visibly shorter.
- Expectations: `math-2020.g3.B2.8`, `math-2020.g4.B1.4`

## Attempts

- One task is: one pair of cards.
- An attempt is recorded when: a card is tapped.
- Success means: the bigger fraction was tapped.
- Retries of the same task are recognised by: `task-<n>`.

## Effort

After **2 misses** on a task, the hint is said and the bigger card is marked.

## Avatar

Thinking while the student chooses, happy on a right tap, encouraging on a miss, cheering at the end.

## Strings

| ID | English |
| --- | --- |
| `title` | Template Game |
| `intro` | Tap the bigger fraction. |
| `task.which` | Which one is bigger? |
| `right` | Yes! That one is bigger. |
| `wrong` | Not that one. Look at the size of each piece. |
| `hint` | The smaller the bottom number, the bigger each piece. |
| `done` | You did it! |
| `frac.1-2` | one half |
| `frac.1-3` | one third |
| `frac.1-4` | one fourth |
| `frac.1-5` | one fifth |
| `frac.1-6` | one sixth |
| `frac.1-8` | one eighth |

## Art

| Slot | What it shows |
| --- | --- |
| `bar` | A fraction bar's empty frame, behind each card's filled piece. |
| `star` | The burst on a right tap. |

## Teacher card

- Teaches: comparing unit fractions.
- Grades and tiers: placeholder.
- Expectations: placeholder.
- The mechanic in 30 seconds: placeholder.
- Misconceptions it reveals:
  - `bigger-denominator-bigger`: "Thinks a fraction with a bigger bottom number is bigger." Reteach: placeholder.
- When to use it: never; it's a template.

## Open questions

None.
