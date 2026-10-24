// The synthesis worker (issue 03's Python `synth`) takes one JSON request on
// stdin, loads the model once, writes every file and exits. It knows nothing
// about games, hashes or lockfiles.
import { spawn } from "node:child_process";
import type { VoiceSettings } from "./hash.ts";

export interface SynthRequest {
  voice: VoiceSettings;
  lines: { text: string; speed: number; outPath: string }[];
}

/** Writes an MP3 to each line's `outPath`; rejects if the worker fails. */
export type SynthWorker = (request: SynthRequest) => Promise<void>;

const packageDir = new URL("../", import.meta.url).pathname;

/** Runs `uv run synth` in packages/voice, with the request on stdin and stdio inherited. */
export function uvWorker(command = ["uv", "run", "synth"]): SynthWorker {
  return (request) =>
    new Promise((resolve, reject) => {
      const [file, ...args] = command as [string, ...string[]];
      const child = spawn(file, args, {
        cwd: packageDir,
        stdio: ["pipe", "inherit", "inherit"],
      });
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`${command.join(" ")} exited with code ${code}`)),
      );
      child.stdin.end(JSON.stringify(request));
    });
}
