# Fraction Hop gets its journey

Status: ready-for-human
Blocked by: 01

Run `design-game` ("Giving a built game its journey"), then `build-game`.

The founder's idea: a Mario-style overworld map, where the last task gets the student to a treasure. The play opens on the map with the chest at the far end, the avatar walks to the next spot after each task, and the chest opens after task 6.

To work out in the prototype:

- How a task's course fits inside the map. Each course starts from 0 and hides its goal, and neither can change.
- Whether walking between spots feels slow by the fifth time, inside the 4-second limit.

New voice lines (the goal and the ending) need the founder to run `pnpm voice`.
