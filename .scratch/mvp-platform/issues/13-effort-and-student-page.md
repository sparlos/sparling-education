# 13: Effort and the student page

**What to build:** Kindling computes effort from how a student worked, and the teacher opens a student's page (from their grid row) to see their effort evidence by Learning Skill.

**Blocked by:** 10, 21

**Status:** ready-for-human

- [x] The scoring module computes effort using the spec's provisional rule: tasks failed and later succeeded on (the same task ID across retries), plus finished plays. Raw attempts and time spent never count, and a crashed play counts neither for nor against
- [x] Effort maps onto the curriculum package's Learning Skills
- [x] The student page shows the student's effort evidence by Learning Skill, links to their results, and has space for recognition (ticket 15) and quick assess (ticket 16)
- [x] Integration tests post play records covering retries, improvement, spamming attempts, crashes and plays left partway, and check the effort that comes back. Rendered-app tests cover the student page

## Comments

**Agent, 2026-10-29:** Built; over to the founder to check and commit.

- The rule is `effortRule` and `effortOf` in `apps/api/src/scoring.ts`. Two kinds of effort, each mapped to one Learning Skill from `@repo/curriculum`:
  - **Improved after a mistake** → Self-Regulation ("perseveres and makes an effort when responding to challenges"): a task with a failed try and a success after it, in the same play (task IDs identify a task within a play, per the game contract). A success with help counts. It counts once however many tries it took, so spamming adds nothing. Exploring tries are neither a mistake nor a success.
  - **Finished plays** → Responsibility ("completes and submits class work").
  - A crashed play counts for nothing, including when its crash arrives later. A play left partway (or not ended yet) counts its improvements but isn't finished.
  - The skill mapping is my call, not from the spec. It's a one-line change each in `effortRule` (and the fake's copy, which the contract suite holds in step).
- Effort is counted over all the student's plays for that class, with no time window. Ticket 14's weekly cap can apply `effortOf` to one week's records.
- `GET /classes/{classId}/students/{studentId}` (`getStudentPage`) returns the student, their effort by skill (curriculum order, only the skills effort is evidence of), and their dashboard row's results with descriptions.
- Teacher app: `/teach/classes/<classId>/students/<studentId>`, opened from the student's name in their dashboard row. Each result links to its evidence. The page is built as sections so recognition (15) and quick assess (16) can go in below the results.
- Small fixes on the way: the contract harness's `play` takes an optional `"left"` ending, so the fake now records how a play ended instead of always "finished". `getStudentPage` is exported from `@repo/api-client`.
- Checked at 1366 and 360 px in headless Chrome: no horizontal scroll, and the new links are 48 px tall. The "Room 12 results" up link is 44 px tall, but that's the existing subtle `ButtonLink`, also used on the evidence screen.
