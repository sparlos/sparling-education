# Games emit attempts; Kindling computes understanding and effort

A game never scores itself or calls the API. It emits **attempts** (task, expectation code, success, optional misconception tag) through the game contract, and the play shell batches and sends them as the signed-in student. Kindling then computes understanding and effort from them the same way for every game. Effort must be comparable and fair across games, and must reward improvement after a retry rather than raw retries. Understanding must map onto expectation codes for quick assess. Both are easier to keep correct in one place than to reimplement in every agent-built game, and the rules can change without touching any game.

## Considered options

- Games compute and report their own understanding and effort. Rejected: every game would end up with different effort rules.
- Games call the API directly. Rejected: games would hold credentials, couldn't be swapped onto the demo class's simulated backend, and couldn't be tested without a backend.

## Consequences

- Every attempt records the game version, the tier, and each expectation as a code plus its curriculum edition, so old results stay accurate after a game or the curriculum changes.
- Games describe each task (`asked`) and each try (`detail`) in short plain text for teachers, the same way in every game, instead of a per-game schema. The platform stores and shows that text and never parses it, except to draw `a/b` and mixed numbers as fractions. Tries that only explored are sent too, marked `exploring`, and scoring never counts them.
