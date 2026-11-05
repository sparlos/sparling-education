// Fraction Hop: build a route from fraction hops to a hidden goal, press
// play, and watch the avatar hop it. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import blockDrop from "../audio/block-drop.ogg";
import chestOpen from "../audio/chest-open.ogg";
import coins from "../audio/coins.ogg";
import goalFound from "../audio/goal-found.ogg";
import hopLand from "../audio/hop-land.ogg";
import hopTakeoff from "../audio/hop-takeoff.ogg";
import splash from "../audio/splash.ogg";
import treasureFanfare from "../audio/treasure-fanfare.ogg";
import { FractionHop } from "./game/FractionHop.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, FractionHop, {
  "block-drop": blockDrop,
  "hop-takeoff": hopTakeoff,
  "hop-land": hopLand,
  splash,
  "goal-found": goalFound,
  "chest-open": chestOpen,
  coins,
  "treasure-fanfare": treasureFanfare,
});
