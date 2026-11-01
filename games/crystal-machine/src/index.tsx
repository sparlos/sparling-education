// Crystal Machine: make a number by setting how many crystals each chute
// drops, then run the machine. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import crystalDrop from "../audio/crystal-drop.ogg";
import crystalMerge from "../audio/crystal-merge.ogg";
import { CrystalMachine } from "./game/CrystalMachine.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, CrystalMachine, {
  "crystal-drop": crystalDrop,
  "crystal-merge": crystalMerge,
});
