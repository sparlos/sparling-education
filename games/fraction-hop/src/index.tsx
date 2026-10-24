// Fraction Hop: build a route from fraction hops to a hidden goal, press
// play, and watch the avatar hop it. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import { FractionHop } from "./game/FractionHop.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, FractionHop);
