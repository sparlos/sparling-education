# <Game name>

Status: draft
Slug: <slug> (game link: /play/<slug>)
Version: 1
Renderer: dom | pixi | playcanvas (<justification if not dom>)
Avatar: portrait | character
Description: <one or two short sentences on the game's card on the try site: the fun first, in kid-friendly words, then "Teaches <concept>." Never spoken.>

## Why it's fun

<The prototype the founder played and picked (lab slug), what they liked about it, and the game or genre it borrows from. The other prototypes and why they were rejected.>

## Concept

<The one concept the game teaches, and the grade range.>

## Mechanic

<What the student does, step by step, and why getting better at it is getting better at the concept. What visibly fails when a wrong idea is applied.>

## Journey

Kind: going somewhere | building something.

- **From the start:** <what the student sees they're heading for, and the voice line that says so>
- **After each task:** <how the game's own world shows they're closer: the shell's "2/6" bar doesn't count. At most 4 seconds, with no voice line, nothing to tap and no skip. The next task arrives by itself, with its own line>
- **The end:** <the big moment after the last task, about 5 seconds, with a voice line and no skip>

<The journey is the same for every student, however much help they had, and starts fresh each play. Nothing from it is kept after the play. Record any founder's call that goes past these limits here, with the reason.>

## Tiers

### <tier id, e.g. g4>: Grade <n>

- Expectations: `<edition>.g<n>.<code>`, ...
- Tasks: <what the tasks look like at this tier and how they differ from neighbouring tiers>

## Misconceptions

### `<misconception-id>`

- The wrong idea: <in plain words>
- In play: <what the student does and what visibly fails>
- Expectations: `<id>`, ...

## Attempts

- One task is: <...>
- One try, recorded as one attempt as it happens: <...>
- Success means: <...>
- Retries of the same task are recognised by: <task ID scheme>
- Exploring tries (if any), sent with `exploring: true` and never scored: <...>
- `assisted` on each attempt: the help that was on before that try.
- Misconception: on the try that brings it over its threshold, at most once per task.

**What the teacher sees for each task and try.** Plain text, fractions as `a/b`. One row per form, each rebuilt from the rules by the spec tests:

| Field | When | Text |
| --- | --- | --- |
| `asked` | Every try at the task, the same | `<e.g. Reach 5/4 on a course in eighths. Blocks: 1/8, 1/4, 1/2, 1.>` |
| `detail` | <each kind of try> | `<e.g. Hopped 1/8 + 1/8 + 1/4: splashed at 4/8.>` |

## Effort

<How the game invites a retry after a mistake.>

## Avatar

<What the portrait reacts to, and what the character does if it's in the game.>

## Strings

Every string a student sees or hears. Each one also becomes a voice line. `title` is the game's name, as home shows and says it.

| ID | English |
| --- | --- |
| `title` | <Game name> |
| `<id>` | <text> |

## Art

The named art slots the game needs, each drawn first as SVG from the style kit.

| Slot | What it shows |
| --- | --- |
| `<slot-id>` | <...> |

## Teacher card

- Teaches: <...>
- Grades and tiers: <...>
- Expectations: <IDs with our own descriptions>
- The mechanic in 30 seconds: <...>
- Misconceptions it reveals:
  - `<misconception-id>`: "<The wrong idea in one sentence, as teachers see it on the dashboard; the manifest's `description`, word for word>" Reteach: <one classroom move>
  - In results, e.g. "3 students treated 1/8 as larger than 1/4".
- When to use it: <relative to instruction, e.g. after introducing equivalent fractions>

## Open questions

<Anything still to settle, or "None".>
