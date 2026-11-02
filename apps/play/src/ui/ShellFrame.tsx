// What every shell page sits in: its voice recordings, the gate that silences
// them, and the block over a screen too small to play on. The page stays
// underneath as it was, inert and silent, until the screen is big enough.
import { type ReactNode, useMemo } from "react";
import { createVoiceGate, type VoiceOptions } from "../play/voice.ts";
import type { LineMap } from "../play/voice-lines.ts";
import classes from "./app.module.css";
import { noRecordings, ShellLines, ShellVoiceGate } from "./shared.tsx";
import { TooSmall, useTooSmall } from "./TooSmall.tsx";

export function ShellFrame({
  shellLines,
  titleLines,
  speak,
  children,
}: {
  /** The recordings of the shell's own lines; lines without one use browser speech. */
  shellLines?: LineMap;
  /** Each game's recorded title, by slug; a game without one is said by browser speech. */
  titleLines?: LineMap;
  /** Browser speech, replaceable in tests. */
  speak?: VoiceOptions["speak"];
  children: ReactNode;
}) {
  const recordings = useMemo(
    () =>
      shellLines || titleLines
        ? { shell: shellLines ?? {}, titles: titleLines ?? {} }
        : noRecordings,
    [shellLines, titleLines],
  );
  const gate = useMemo(createVoiceGate, []);
  const tooSmall = useTooSmall();
  return (
    <ShellLines.Provider value={recordings}>
      {/* Outside the gate's provider: the block's own line is the one that's heard. */}
      {tooSmall && <TooSmall gate={gate} speak={speak} />}
      <ShellVoiceGate.Provider value={gate}>
        <div className={classes.page} inert={tooSmall}>
          {children}
        </div>
      </ShellVoiceGate.Provider>
    </ShellLines.Provider>
  );
}
