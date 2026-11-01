// The whole screen for one lap: the loop (with the trip picture or the
// replay over its field), and beside it the portrait, help, the number pad
// and Go, with the caption under both. The tutorial and real laps both
// render it; only who taps differs.
import type { AvatarExpression } from "@repo/game-contract";
import { palette } from "@repo/tokens";
import type { ComponentType, CSSProperties } from "react";
import type { DemoStep } from "../rules/demo.ts";
import type { Key, LapState } from "../rules/task.ts";
import type { StringId } from "../strings.ts";
import { PanelArt } from "./art.tsx";
import { captionText } from "./caption.ts";
import { GhostHand } from "./GhostHand.tsx";
import styles from "./game.module.css";
import {
  Loop,
  type StationMoment,
  type TrainView,
  type WrongSign,
} from "./Loop.tsx";
import { Replay, type ReplayView } from "./Replay.tsx";
import { TripPicture } from "./TripPicture.tsx";

export interface BoardProps {
  state: LapState;
  train: TrainView;
  roof: number | null | "hidden";
  gateOpen: boolean;
  tally: string | null;
  moment: StationMoment | null;
  checking: boolean;
  running: boolean;
  caption: readonly StringId[];
  t(id: StringId): string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  expression: AvatarExpression;
  /** False while the tutorial acts the lap out, between laps, and during the replay. */
  interactive: boolean;
  replay: { step: DemoStep; view: ReplayView } | null;
  hand: string | null;
  tapping: boolean;
  onKey(key: Key): void;
  onGo(): void;
  onHelp(): void;
  /** The tutorial's skip button. */
  onSkip?: () => void;
}

const keys: Key[] = [
  "7",
  "8",
  "9",
  "4",
  "5",
  "6",
  "1",
  "2",
  "3",
  ".",
  "0",
  "del",
];

/** Which sign the last run turned red. */
function wrongSign(state: LapState): WrongSign {
  const run = state.lastRun;
  if (!run || run.succeeded) return null;
  return run.end.stalled ? { station: run.end.station } : "back";
}

export function Board(props: BoardProps) {
  const { state, t } = props;
  const { lap } = state;
  const busy = !props.interactive || props.running;
  const canGo = state.typed !== "" && state.typed !== ".";
  return (
    <div
      className={`${styles.board} ${props.onSkip ? styles.demo : ""}`}
      data-tone="student"
      data-testid="board"
      style={
        {
          "--wrong": palette.ember[6],
          "--unload-soft": palette.sky[0],
          "--load-ink": palette.leaf[8],
          "--unload-ink": palette.sky[8],
          "--check": palette.sunshine[5],
          "--halo": palette.sand[0],
          "--sign-ink": palette.ink[9],
          "--roof": palette.sand[0],
        } as CSSProperties
      }
    >
      <div className={styles.loopArea}>
        <div className={styles.loopBox}>
          <Loop
            lap={lap}
            typed={state.typed}
            train={props.train}
            roof={props.roof}
            gateOpen={props.gateOpen}
            tally={props.tally}
            moment={props.moment}
            checking={props.checking}
            wrong={wrongSign(state)}
            Avatar={props.Avatar}
          />
          {state.hint && !props.replay && <TripPicture lap={lap} />}
          {props.replay && (
            <Replay
              lap={lap}
              step={props.replay.step}
              view={props.replay.view}
            />
          )}
        </div>
      </div>

      <section className={styles.side}>
        <div className={styles.sideTop}>
          <span className={styles.portrait} data-testid="portrait">
            <props.Avatar expression={props.expression} size={72} />
          </span>
          {props.onSkip ? (
            <button
              type="button"
              className={`${styles.button} ${styles.quiet}`}
              onClick={props.onSkip}
              data-testid="skip"
            >
              {t("ui.skip")}
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.quiet} ${state.glow ? styles.glow : ""}`}
              onClick={props.onHelp}
              disabled={busy}
              data-glow={state.glow || undefined}
              data-hand="help"
              data-testid="help"
            >
              {t("ui.help")}
            </button>
          )}
        </div>
        <div className={styles.pad}>
          {keys.map((k) =>
            k === "." && lap.dp === 0 ? (
              <span key={k} />
            ) : (
              <button
                key={k}
                type="button"
                className={styles.key}
                data-testid="key"
                data-key={k}
                data-hand={`key-${k}`}
                disabled={busy}
                aria-label={k === "del" ? "⌫" : k}
                onClick={() => props.onKey(k)}
              >
                <PanelArt slot="pad-key" />
                <span>{k === "del" ? "⌫" : k}</span>
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.go}`}
          onClick={props.onGo}
          disabled={busy || !canGo}
          data-hand="go"
          data-testid="go"
        >
          {t("ui.go")}
        </button>
      </section>

      <p className={styles.caption} aria-live="polite" data-testid="caption">
        {captionText(props.caption, t)}
      </p>

      <GhostHand target={props.hand} tapping={props.tapping} />
    </div>
  );
}
