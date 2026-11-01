// The whole screen for one job: the job and crystal counter, the
// machine (a chute, tube and window per place, plus the extra tube), the
// number pad and Run, the avatar at its lever, and the caption. The
// tutorial and real jobs both render it; only who taps differs.
import type { AvatarExpression } from "@repo/game-contract";
import { palette } from "@repo/tokens";
import {
  type ComponentType,
  type CSSProperties,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { crystalsIn, type JobState } from "../rules/job.ts";
import { windowDigits, wrongWindows } from "../rules/machine.ts";
import { numeral } from "../rules/teacher.ts";
import type { ChutePlace, Place, StringId } from "../strings.ts";
import {
  art,
  crystalColours,
  crystalSlot,
  PanelArt,
  ScreenArt,
} from "./art.tsx";
import { captionText } from "./caption.ts";
import { GemLayer, type Shown } from "./GemLayer.tsx";
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
  onChoose(p: Place): void;
  onDigit(d: number): void;
  onDelete(): void;
  onRun(): void;
  onHint(): void;
  /** The tutorial's skip button. */
  onSkip?: () => void;
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
    <div
      className={`${styles.board} ${props.onSkip ? styles.demo : ""}`}
      data-tone="student"
      data-testid="board"
      style={
        {
          "--chutes": job.chutes + 1,
          "--wrong": palette.ember[5],
          "--wrong-soft": palette.ember[0],
          "--wrong-ink": palette.ember[8],
          // Closed columns' stripes: ink at about a sixth.
          "--stripe": `${palette.ink[9]}29`,
        } as CSSProperties
      }
    >
      <header className={styles.top}>
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
        <span className={styles.spacer} />
        {props.onSkip && (
          <button
            type="button"
            className={`${styles.button} ${styles.quiet} ${styles.skip}`}
            onClick={props.onSkip}
          >
            {t("ui.skip")}
          </button>
        )}
        <button
          type="button"
          className={`${styles.button} ${styles.quiet} ${state.glow ? styles.glow : ""}`}
          onClick={props.onHint}
          disabled={busy}
          data-glow={state.glow || undefined}
          data-hand="hint"
          data-testid="hint"
          data-hint-level={state.hint}
        >
          <ScreenArt slot="icon-hint" size={32} />
          {t("ui.hint")}
        </button>
      </header>

      <div className={styles.main}>
        <section className={styles.machine} data-testid="machine">
          <PanelArt slot="machine" />
          <GemLayer shown={props.shown} />
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
                    aria-label={t(isExtra ? "chute.closed" : `place.${chute}`)}
                    aria-pressed={state.chosen === p}
                    disabled={busy}
                    onClick={() => props.onChoose(p)}
                  >
                    <PanelArt slot="chute" />
                    {closed ? (
                      <span className={styles.lock}>
                        <ScreenArt slot="chute-closed" size={56} />
                      </span>
                    ) : (
                      <>
                        <ScreenArt slot={crystalSlot(p)} size={40} />
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
                  <PanelArt slot="tube" />
                  {closed && !isExtra && state.hint >= 2 && (
                    <span className={styles.trade} data-testid="trade">
                      <ScreenArt slot="trade" size={72} />
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
                  <PanelArt slot="window" />
                  <span>{windows[p] ?? ""}</span>
                </span>
              </div>
            );
          })}
        </section>

        <section className={styles.controls}>
          <Operator
            Avatar={props.Avatar}
            expression={props.expression}
            pulled={props.running}
          />
          <div className={styles.pad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <Key key={d} d={d} busy={busy} onTap={() => props.onDigit(d)} />
            ))}
            <button
              type="button"
              className={styles.key}
              data-testid="key-delete"
              data-hand="key-delete"
              disabled={busy}
              onClick={props.onDelete}
            >
              <PanelArt slot="pad-key" />
              <span>⌫</span>
            </button>
            <Key d={0} busy={busy} onTap={() => props.onDigit(0)} />
          </div>
          <button
            type="button"
            className={`${styles.button} ${styles.run}`}
            onClick={props.onRun}
            disabled={busy}
            data-hand="run"
            data-testid="run"
          >
            <ScreenArt slot="icon-run" size={32} />
            {t("ui.run")}
          </button>
        </section>
      </div>

      <p className={styles.caption} aria-live="polite" data-testid="caption">
        {captionText(props.caption, t)}
      </p>

      <GhostHand target={props.hand} tapping={props.tapping} />
    </div>
  );
}

function Key({ d, busy, onTap }: { d: number; busy: boolean; onTap(): void }) {
  return (
    <button
      type="button"
      className={styles.key}
      data-testid="key"
      data-d={d}
      data-hand={`key-${d}`}
      disabled={busy}
      onClick={onTap}
    >
      <PanelArt slot="pad-key" />
      <span>{d}</span>
    </button>
  );
}

/** The avatar at the control panel, beside the lever, which pulls down on Run. */
function Operator(props: {
  Avatar: BoardProps["Avatar"];
  expression: AvatarExpression;
  pulled: boolean;
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
        <Avatar expression={props.expression} size={80} />
      </span>
      <span className={styles.lever} data-testid="lever">
        <ScreenArt slot="lever" size={28} />
      </span>
    </div>
  );
}

/**
 * Points at whatever `data-hand` names, for the tutorial, guided and the
 * hint nudge. On the lower half of the screen it points down from above,
 * so it never runs off the bottom. `tapping` presses it in.
 */
function GhostHand({
  target,
  tapping,
}: {
  target: string | null;
  tapping: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [shown, setShown] = useState(false);
  const [appearing, setAppearing] = useState(false);
  const wasShown = useRef(false);
  useLayoutEffect(() => {
    const root = ref.current?.parentElement;
    const el =
      target && target !== "center"
        ? root?.querySelector(`[data-hand="${target}"]`)
        : null;
    if (!root || !target || (target !== "center" && !el)) {
      wasShown.current = false;
      setShown(false);
      return;
    }
    const place = () => {
      const box = root.getBoundingClientRect();
      if (!el) {
        setAt({ x: box.width / 2, y: box.height * 0.4, flipped: false });
        return;
      }
      const r = el.getBoundingClientRect();
      const top = r.top - box.top;
      const flipped = top + r.height / 2 > box.height / 2;
      setAt({
        x: r.left - box.left + r.width / 2,
        y: top + r.height * (flipped ? 0.4 : 0.6),
        flipped,
      });
    };
    setAppearing(!wasShown.current);
    wasShown.current = true;
    setShown(true);
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [target]);
  const { anchor } = art["ghost-hand"];
  return (
    <div
      ref={ref}
      className={`${styles.hand} ${appearing ? styles.appearing : ""}`}
      data-testid="ghost-hand"
      data-target={shown && at ? target : undefined}
      style={{
        transform: at
          ? `translate(${at.x - anchor.x}px, ${at.y - anchor.y}px)`
          : undefined,
        opacity: shown && at ? 1 : 0,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          transformOrigin: `${anchor.x}px ${anchor.y}px`,
          transform: at?.flipped ? "rotate(180deg)" : undefined,
        }}
      >
        <div
          className={`${styles.handPress} ${tapping ? styles.tapping : ""}`}
          style={{ transformOrigin: `${anchor.x}px ${anchor.y}px` }}
        >
          <ScreenArt slot="ghost-hand" size={64} />
        </div>
      </div>
    </div>
  );
}
