// The game: an opening line, then the tasks. The rules live in ../rules;
// this file wires them to taps, the voice and the shell.
//
// The voice and the screen take turns, never both at once: `await speak(...)`
// before acting on what was said, never a timer guessed from a line's length.
// The shell mounts the game only after the student taps start, so the first
// line can play.
import type { AvatarExpression, GameProps } from "@repo/game-contract";
import { seeded } from "@repo/game-kit/random";
import { useTimers } from "@repo/game-kit/timers";
import { palette } from "@repo/tokens";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Manifest, manifest } from "../manifest.ts";
import {
  bigger,
  type Denominator,
  generatePlay,
  judge,
  missesForHint,
  tasksPerPlay,
} from "../rules/rules.ts";
import { fracId, type StringId } from "../strings.ts";
import { Art, ScreenArt } from "./art.tsx";
import styles from "./game.module.css";

/** A beat between turns, so one moment doesn't run into the next. */
const beatMs = 400;

export function TemplateGame(props: GameProps<Manifest>) {
  const { tier, t, say, onAttempt, onProgress, onFinish, Avatar } = props;
  const tasks = useMemo(
    () => generatePlay(tier, seeded(Math.floor(Math.random() * 2 ** 31))),
    [tier],
  );
  const { pause } = useTimers();
  const [index, setIndex] = useState(-1);
  const [misses, setMisses] = useState(0);
  const [busy, setBusy] = useState(true);
  const [solved, setSolved] = useState(false);
  const [mood, setMood] = useState<AvatarExpression>("neutral");
  const [caption, setCaption] = useState<readonly StringId[]>([]);
  const task = tasks[index];
  const hinted = misses >= missesForHint;

  /** Shows the caption and says it; settles when it's been said. */
  const speak = useCallback(
    (ids: StringId[]) => {
      setCaption(ids);
      return say(...ids);
    },
    [say],
  );

  const begin = useCallback(
    async (i: number) => {
      const next = tasks[i];
      if (!next) return;
      setIndex(i);
      setMisses(0);
      setSolved(false);
      setMood("thinking");
      setBusy(false);
      await speak(["task.which", fracId(next.left), fracId(next.right)]);
    },
    [tasks, speak],
  );

  // The shell's progress bar: tasks solved out of the play's.
  useEffect(() => onProgress({ done: 0, total: tasksPerPlay }), [onProgress]);

  // The opening: say how to play, then start. Unmounting clears the pause,
  // which ends the script.
  useEffect(() => {
    void (async () => {
      await pause(beatMs);
      await speak(["intro"]);
      await pause(beatMs);
      await begin(0);
    })();
  }, [pause, speak, begin]);

  const tap = async (picked: Denominator) => {
    if (!task || busy) return;
    const verdict = judge(task, picked);
    onAttempt({
      task: `task-${index + 1}`,
      // Each tier evidences one expectation.
      expectation: manifest.tiers[tier].expectations[0],
      ...verdict,
      ...(hinted && { assisted: "hint" as const }),
    });
    if (!verdict.succeeded) {
      const missed = misses + 1;
      setMisses(missed);
      setMood("encouraging");
      await speak(missed === missesForHint ? ["wrong", "hint"] : ["wrong"]);
      return;
    }
    setBusy(true);
    setSolved(true);
    setMood(index + 1 < tasksPerPlay ? "happy" : "cheering");
    onProgress({ done: index + 1, total: tasksPerPlay });
    if (index + 1 < tasksPerPlay) {
      await speak(["right"]);
      await pause(beatMs);
      await begin(index + 1);
    } else {
      await speak(["right", "done"]);
      await pause(beatMs * 2);
      onFinish();
    }
  };

  return (
    <div className={styles.board} data-testid="board">
      <div className={styles.top}>
        <Avatar expression={mood} size={96} />
        <p className={styles.caption} data-testid="caption">
          {caption.map((id) => t(id)).join(" ")}
        </p>
      </div>
      {task && (
        <div className={styles.cards}>
          {[task.left, task.right].map((d) => (
            <button
              key={d}
              type="button"
              className={styles.card}
              data-testid="card"
              data-d={d}
              data-marked={hinted && d === bigger(task)}
              aria-label={t(fracId(d))}
              disabled={busy}
              onClick={() => void tap(d)}
            >
              <span className={styles.frac} aria-hidden="true">
                <span>1</span>
                <span>{d}</span>
              </span>
              <svg
                viewBox="0 0 100 24"
                className={styles.bar}
                aria-hidden="true"
              >
                <Art slot="bar" x={0} y={0} />
                <rect
                  x="3"
                  y="3"
                  width={94 / d}
                  height="18"
                  rx="2"
                  fill={palette.leaf[5]}
                />
              </svg>
              {solved && d === bigger(task) && (
                <span className={styles.star}>
                  <ScreenArt slot="star" size={48} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
