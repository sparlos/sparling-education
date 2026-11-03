# Fraction Hop gets its journey

Status: ready-for-human
Blocked by: 01

Run `design-game` ("Giving a built game its journey"), then `build-game`.

The founder's idea: a Mario-style overworld map, where the last task gets the student to a treasure. The play opens on the map with the chest at the far end, the avatar walks to the next spot after each task, and the chest opens after task 6.

To work out in the prototype:

- How a task's course fits inside the map. Each course starts from 0 and hides its goal, and neither can change.
- Whether walking between spots feels slow by the fifth time, inside the 4-second limit.

New voice lines (the goal and the ending) need the founder to run `pnpm voice`.

## Comments

2026-11-03: Three journeys in the lab, each over the real board and rules: `lab/hop-map-zoom` (the founder's idea: the map fills the screen, about 2.25 s between courses), `lab/hop-map-strip` (a small path in the top row, about 1.45 s) and `lab/hop-horizon` (no map: a treasure island grows behind the course, about 2.25 s). All played through in headless Chrome at 1366 × 650 and 1280 × 650, with no scrolling. Waiting on the founder to play them and pick one. Then: the grilling on the Journey section, the spec, `build-game`. The kit's lines ("Let's hop across the islands to the treasure!", "You found the treasure! Great hopping!") are drafts. `task.next` goes away in the build, since the next course arrives with its own line. No sounds yet: Fraction Hop has no audio files.

2026-11-03: Founder likes the big map (`lab/hop-map-zoom`). Their notes: the zoom has to land on the avatar, and the zoom and fade should be slower. Now the map's avatar lands exactly on the course's avatar, in place and size, and the zoom takes 0.8 s with a 0.35 s fade. The moment between courses is about 2.85 s.

2026-11-03: Founder's verdict on the lab: "looks good - build it!" after a bigger avatar on the map (48 px, still landing exactly on the course's). No separate grilling: the Journey section in `games/fraction-hop/SPEC.md` is what they played, and the readings below are for them to confirm. Built: `src/game/TreasureMap.tsx`, wired through `FractionHop.tsx`. Tests, 60 mutations and the tour pass; the tour now fails if the zoom misses the character. Readings: (1) the ending pulls back as between tasks, where the lab cut to the map; (2) the chest's open hold is 3 s, not the lab's 3.8 s, so the whole ending is about 5.6 s, not longer; (3) the whole map now fits the game area with open sea around it, since the game area is narrower than the lab's and cropped the islands; (4) a dark pill behind the map's line, so it reads over the sea and islands. Waiting on the founder: `pnpm voice` (`journey.goal` new, `play.done` changed, `task.next` gone), then playing and accepting it. After acceptance: the retro (`docs/agents/skill-retro.md`) for design-game and build-game, `review-game` in a fresh session, and unblock 03.

2026-11-03: Founder on the zoom: landing exactly on the course's character, off to the left, "looks weird", because it doesn't zoom in on the avatar. New arrival, their idea: the camera zooms right in with the character mid-screen, the map fades to just the character, dock and water, the dock slides left, then the stones, number line and controls fade in. Readings: (1) mid-screen is across only, since the slide is purely sideways and the character stays at the course's height; (2) the pull back is unchanged: the map fades in around the character where it finished; (3) to stay inside the 4-second limit the fade is 0.3 s, the slide 0.35 s and the fade in 0.2 s, making the moment about 4.0 s. Tests, mutations and the tour are updated but not yet run on this version. Waiting on the founder to play it.
