# The MVP ships without the class world

The MVP is five games across the Number strand (Grades 3–5) and the platform around them: Google sign-in, classes, a 2D **locker** for each student, rewards and recognition, and a teacher dashboard with drill-down and quick assess. The shared 3D class world (hub, portals, presence, houses, invites and visits) comes later. The world was most of the planned build, and none of it is what makes a teacher say "I want this for my class": games where the concept is the mechanic, and evidence a teacher can act on and use for report cards, are. Spending the build on a complete strand of games and the teacher evidence first puts the effort where the demo and the pilot are won. The pilot waits until all five games are accepted, trading earlier classroom feedback for a first impression that covers a whole strand.

## Considered options

- Keep the class world in the MVP with two games, as first designed. Rejected: the world would take most of the build and still leave teachers with too few games and no real evidence.
- Pilot as soon as Fraction Hop and the dashboard work, adding games during the pilot. Rejected: a single game is a thin first impression for teachers, and the founder chose a complete strand over earlier feedback.

## Consequences

- `apps/hubworld` and the 3D export of `@repo/avatar` are deleted. The last commit that has them is tagged `world-poc`, so the prototype is one checkout away. The PlayCanvas skills stay installed for later.
- `hubworld-api` becomes the platform's core API, `api` (and its client `api-client`), with multiplayer presence removed.
- The locker replaces the hub as where students arrive and where every game returns them. Rewards are outfit pieces and stickers instead of furniture; recognition is an exclusive sticker.
- Nicknames, preset phrases and emotes only existed for the world, so they go with it; the glossary keeps the terms for later.
- The marketing site stops promising the class world, houses, visits, portals and the parent view, and leads with the games, misconceptions and quick assess, with one "coming next" line for the world and the parent view.
- Principle 8 ("Games stand alone") keeps the world optional when it returns: it must be one more way into games, never a requirement for them, so nothing built now depends on it.
