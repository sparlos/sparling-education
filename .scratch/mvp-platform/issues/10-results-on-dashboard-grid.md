# 10: Plays become results on the dashboard grid

**What to build:** When a student plays, their attempts reach the API and become results. The teacher's dashboard opens on the class's students against the expectations its games evidence, with each cell showing an understanding band or "no evidence yet", next to each expectation's plain-language description.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] `POST /play-records` meets the play shell's platform contract: idempotent by record ID, ordered within a play, batches of at most 25, late batches trusted by device time, validated against the game's manifest at that version, 4xx for batches that will never be accepted, and 403 when the student doesn't match the session
- [ ] The real `PlayRecordsPort` adapter passes the existing contract suite against the in-process API
- [ ] One scoring module computes understanding per student per expectation from stored attempts, using the spec's provisional rule (share of tasks eventually succeeded at without help, at that tier). It's shown as "not yet showing", "developing", "showing consistently" or "no evidence yet". Never a percentage mark or a level
- [ ] Each result keeps its tier, game version and expectation edition, and evidence from another tier is marked in the cell
- [ ] Expectation descriptions come from the curriculum package's product layer only (ADR 0001)
- [ ] Integration tests post play records and read results back. Rendered-app tests cover the grid, including empty cells
