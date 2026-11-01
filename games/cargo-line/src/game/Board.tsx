// One lap in the game frame: the loop (with the trip picture or the replay
// over its field), and beside it the portrait, the number pad and Go. The tutorial and real laps both
// render it; only who taps differs.
import type { AvatarExpression } from "@repo/game-contract";
import { GameFrame, NumberPad } from "@repo/game-kit/frame";
import { palette } from "@repo/tokens";
import type { ComponentType, CSSProperties } from "react";
import type { DemoStep } from "../rules/demo.ts";
import type { Key, LapState } from "../rules/task.ts";
import type { StringId } from "../strings.ts";
import { captionText } from "./caption.ts";
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
    <GameFrame
      t={t}
      hint={{ onTap: props.onHelp, disabled: busy, glow: state.glow }}
      onSkip={props.onSkip}
      stage={
        <div
          className={styles.loopArea}
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
      }
      caption={captionText(props.caption, t)}
      side={
        <>
          <span className={styles.portrait} data-testid="portrait">
            <props.Avatar expression={props.expression} size={72} />
          </span>
          <NumberPad disabled={busy} decimal={lap.dp > 0} onKey={props.onKey} />
        </>
      }
      main={{ label: t("ui.go"), onTap: props.onGo, disabled: busy || !canGo }}
      hand={props.hand}
      tapping={props.tapping}
    />
  );
}
