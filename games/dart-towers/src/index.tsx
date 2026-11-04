// Dart Towers: load exactly enough darts to stop each wave of bugs, from dark
// until the sun comes up. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import bugPop from "../audio/bug-pop.ogg";
import dartFire from "../audio/dart-fire.ogg";
import glassSmash from "../audio/glass-smash.ogg";
import wallThud from "../audio/wall-thud.ogg";
import waveClear from "../audio/wave-clear.ogg";
import { DartTowers } from "./game/DartTowers.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, DartTowers, {
  "dart-fire": dartFire,
  "bug-pop": bugPop,
  "glass-smash": glassSmash,
  "wall-thud": wallThud,
  "wave-clear": waveClear,
});
