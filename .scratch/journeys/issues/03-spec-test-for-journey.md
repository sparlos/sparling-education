# Fail any game spec with no Journey section

Status: ready-for-agent
Blocked by: 01, 02

Add a check to `describeManifestSpec` in `packages/game-kit` (`@repo/game-kit/spec`), so every game's spec test fails when its `SPEC.md` has no Journey section with its three parts. It waits for 01 and 02, because it would fail on those games until they have one.

Then remove from `review-game` whatever the test now covers.
