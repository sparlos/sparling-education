// Cargo Line: type the missing number on a train's trip, then watch it run. See ../SPEC.md.
import { defineGame } from "@repo/game-contract";
import { CargoLine } from "./game/CargoLine.tsx";
import { manifest } from "./manifest.ts";

export default defineGame(manifest, CargoLine);
