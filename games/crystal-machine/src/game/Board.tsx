// One job in the game frame: the job and crystal counter, the machine (a
// chute, tube and window per place, plus the extra tube), the number pad and
// Run, the avatar at its lever, and the caption. The
// tutorial and real jobs both render it; only who taps differs.
import type { AvatarExpression } from "@repo/game-contract";
import { GameFrame, NumberPad } from "@repo/game-kit/frame";
import { palette } from "@repo/tokens";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { crystalsIn, type JobState } from "../rules/job.ts";
import { windowDigits, wrongWindows } from "../rules/machine.ts";
import { numeral } from "../rules/teacher.ts";
import type { ChutePlace, Place, StringId } from "../strings.ts";
import {
  crystalColours,
  crystalSlot,
  machineSlot,
  PanelArt,
  ScreenArt,
  tradeOf,
} from "./art.tsx";
import { captionText } from "./caption.ts";
import { GemLayer, type Shown } from "./GemLayer.tsx";
import type { GemEvents } from "./gems.ts";
import styles from "./machine.module.css";

export interface BoardProps {
  state: JobState;
  /** What the tubes hold now, by place (the extra tube's included). */
  shown: Shown;
  running: boolean;
  caption: readonly StringId[];
  t(id: StringId): string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  expression: AvatarExpression;
  /** False while the tutorial acts the job out, or between jobs. */
  interactive: boolean;
  /** What the ghost hand points at: a `data-hand` value. */
  hand: string | null;
  tapping: boolean;
  /** Bumped to flash the counter on a refused Run. */
  counterFlash: number;
  /** The gems' moments that make a sound. */
  gemEvents: GemEvents;
  onChoose(p: Place): void;
  onDigit(d: number): void;
  onDelete(): void;
  onRun(): void;
  onHint(): void;
  /** The tutorial's skip button. */
  onSkip?: () => void;
  /** What lies over the whole screen: the journey's crystal. */
  overlay?: ReactNode;
  /** The ending has the avatar, so the control panel's stands empty. */
  operatorAway?: boolean;
}

export function Board(props: BoardProps) {
  const { state, t } = props;
  const { job } = state;
  const busy = !props.interactive || props.running;
  const places = Array.from(
    { length: job.chutes + 1 },
    (_, i) => (job.chutes - i) as Place,
  );
  const made = state.made;
  const windows = windowDigits(props.running ? null : made, job.chutes);
  const wrong =
    made !== null && !props.running && made !== job.number
      ? wrongWindows(made, job.number, job.chutes)
      : null;
  const want = windowDigits(job.number, job.chutes);
  const total = crystalsIn(state.plan);
  const over = total > job.count;

  return (
    // The colours its info and machine share.
    <div
      className={styles.vars}
      style={
        {
          "--chutes": job.chutes + 1,
          "--wrong": palette.ember[5],
          "--wrong-soft": palette.ember[0],
          "--wrong-ink": palette.ember[8],
          // Closed columns' stripes: ink at about a sixth.
          "--stripe": `${palette.ink[9]}29`,
          // What darkens behind the giant crystal: ink at about seven eighths.
          "--scrim": `${palette.ink[9]}e0`,
        } as CSSProperties
      }
    >
      <GameFrame
        t={t}
        info={
          <>
            <div
              className={styles.job}
              data-hand="job"
              data-testid="job"
              data-number={job.number}
              data-count={job.count}
            >
              {numeral(job.number)}
            </div>
            <div
              key={props.counterFlash}
              className={`${styles.counter} ${props.counterFlash ? styles.flash : ""}`}
              data-over={over || undefined}
              data-testid="counter"
              data-hand="counter"
            >
              <ScreenArt slot="counter" size={36} />
              <span>
                {total} / {job.count}
              </span>
            </div>
          </>
        }
        hint={{
          onTap: props.onHint,
          disabled: busy,
          glow: state.glow,
          level: state.hint,
        }}
        onSkip={props.onSkip}
        stage={
          <section className={styles.machine} data-testid="machine">
            <PanelArt slot={machineSlot(job.chutes + 1)} />
            <GemLayer shown={props.shown} events={props.gemEvents} />
            {places.map((p) => {
              const isExtra = p === job.chutes;
              const chute = p as ChutePlace;
              // The extra tube has no chute of its own: it shows as closed.
              const closed = isExtra || job.closed.includes(chute);
              return (
                <div
                  key={p}
                  className={styles.column}
                  data-place={p}
                  style={
                    {
                      "--crystal": crystalColours[p][1],
                      "--crystal-dark": crystalColours[p][2],
                    } as CSSProperties
                  }
                >
                  {
                    <button
                      type="button"
                      className={styles.chute}
                      data-testid="chute"
                      data-place={p}
                      data-hand={`chute-${p}`}
                      data-closed={closed || undefined}
                      data-extra={isExtra || undefined}
                      data-chosen={(state.chosen === p && !closed) || undefined}
                      data-locked={state.locked.includes(chute) || undefined}
                      aria-label={t(
                        isExtra ? "chute.closed" : `place.${chute}`,
                      )}
                      aria-pressed={state.chosen === p}
                      disabled={busy}
                      onClick={() => props.onChoose(p)}
                    >
                      <PanelArt slot={closed ? "chute-locked" : "chute"} />
                      {closed ? (
                        <span className={styles.lock}>
                          <ScreenArt slot="chute-closed" size={56} />
                        </span>
                      ) : (
                        <>
                          <ScreenArt slot={crystalSlot(p)} size={32} />
                          <span className={styles.count} data-testid="count">
                            {state.plan[p] ?? 0}
                          </span>
                        </>
                      )}
                    </button>
                  }
                  <span className={styles.placeTag} data-testid="place-tag">
                    {numeral(10 ** p)}
                  </span>
                  <div
                    className={styles.tube}
                    data-testid="tube"
                    data-place={p}
                    data-count={props.shown.tubes[p] ?? 0}
                  >
                    <PanelArt
                      slot={
                        closed && !props.shown.tubes[p] ? "tube-sealed" : "tube"
                      }
                    />
                    {/* Clear of a run, so the crystals landing here are seen. */}
                    {closed &&
                      !isExtra &&
                      state.hint >= 2 &&
                      !props.running && (
                        <span className={styles.trade} data-testid="trade">
                          <ScreenArt slot={tradeOf(p)} size={86} />
                        </span>
                      )}
                  </div>
                  <span
                    className={styles.hintDigit}
                    data-testid="hint-digit"
                    data-shown={
                      (state.hint >= 1 && want[p] !== null) || undefined
                    }
                  >
                    {state.hint >= 1 && want[p] !== null && (
                      <>
                        <PanelArt slot="hint-digit" />
                        <span>{want[p] ?? ""}</span>
                      </>
                    )}
                  </span>
                  <span
                    className={styles.window}
                    data-testid="window"
                    data-wrong={wrong?.[p] || undefined}
                  >
                    <PanelArt
                      slot={
                        wrong?.[p]
                          ? "window-wrong"
                          : made !== null &&
                              !props.running &&
                              typeof windows[p] === "number"
                            ? "window-right"
                            : "window"
                      }
                    />
                    <span>{windows[p] ?? ""}</span>
                  </span>
                </div>
              );
            })}
          </section>
        }
        caption={captionText(props.caption, t)}
        side={
          <>
            <Operator
              Avatar={props.Avatar}
              expression={props.expression}
              pulled={props.running}
              away={props.operatorAway ?? false}
            />
            <NumberPad
              disabled={busy}
              onKey={(k) =>
                k === "del" ? props.onDelete() : props.onDigit(Number(k))
              }
            />
          </>
        }
        main={{ label: t("ui.run"), onTap: props.onRun, disabled: busy }}
        hand={props.hand}
        tapping={props.tapping}
      >
        {props.overlay}
      </GameFrame>
    </div>
  );
}

/** The avatar at the control panel, beside the lever, which pulls down on Run. */
function Operator(props: {
  Avatar: BoardProps["Avatar"];
  expression: AvatarExpression;
  pulled: boolean;
  away: boolean;
}) {
  const { Avatar } = props;
  return (
    <div
      className={styles.operator}
      data-slot="operator"
      data-pulled={props.pulled || undefined}
    >
      <PanelArt slot="operator" />
      <span className={styles.portrait}>
        {!props.away && <Avatar expression={props.expression} size={60} />}
      </span>
      <span className={styles.lever} data-testid="lever">
        <ScreenArt slot={props.pulled ? "lever-down" : "lever"} size={64} />
      </span>
    </div>
  );
}
