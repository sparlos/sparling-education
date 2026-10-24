// The whole screen for one course: the goal, the course, the caption, the
// plan and the hop blocks. The tutorial and real tasks both render it; only
// who taps differs.
import type { AvatarExpression } from "@repo/game-contract";
import {
  type ComponentType,
  Fragment,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { RunEnd } from "../rules/course.ts";
import type { TaskState } from "../rules/task.ts";
import { parseAmount, type StringId } from "../strings.ts";
import { ScreenArt, screenArt } from "./art.tsx";
import { Course, type Hopper } from "./Course.tsx";
import { Frac } from "./Frac.tsx";
import styles from "./hop.module.css";

export interface BoardProps {
  task: TaskState;
  hopper: Hopper;
  result: RunEnd | null;
  running: boolean;
  caption: readonly StringId[];
  t(id: StringId): string;
  Avatar: ComponentType<{ expression: AvatarExpression; size: number }>;
  expression: AvatarExpression;
  /** False while the tutorial acts the course out. */
  interactive: boolean;
  /** What the ghost hand points at: a `data-hand` value. */
  hand: string | null;
  /** The ghost hand is pressing what it points at. */
  tapping: boolean;
  onAdd(d: number): void;
  onRemove(i: number): void;
  onPlay(): void;
  onHint(): void;
  /** The tutorial's skip button, in place of the hint button. */
  onSkip?: () => void;
}

export function Board(props: BoardProps) {
  const { task, t } = props;
  const { course } = task;
  const busy = !props.interactive || props.running;
  const guidedLabels = task.guided !== null;
  const goal = course.shown;

  return (
    <div
      // In the tutorial the controls are off but look on, so the hand's taps look real.
      className={`${styles.board} ${props.onSkip ? styles.demo : ""}`}
      data-tone="student"
      data-testid="board"
    >
      <header className={styles.top}>
        <div className={styles.goal} data-hand="goal">
          <span>{t("ui.goal-at")}</span>
          <span className={styles.goalChip} data-testid="goal-at">
            <Frac {...goal} />
          </span>
        </div>
        {props.onSkip ? (
          <button
            type="button"
            className={`${styles.button} ${styles.quiet}`}
            onClick={props.onSkip}
          >
            {t("ui.skip")}
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.button} ${styles.quiet} ${task.glow ? styles.glow : ""}`}
            onClick={props.onHint}
            disabled={busy}
            data-glow={task.glow || undefined}
            data-hand="hint"
            data-hint-level={task.hint}
          >
            <ScreenArt slot="icon-hint" size={32} />
            {t("ui.hint")}
          </button>
        )}
      </header>

      <div className={styles.courseBox}>
        <Course
          course={course}
          plan={task.plan}
          hopper={props.hopper}
          result={props.result}
          revealed={task.revealed}
          labels={task.hint >= 1 || guidedLabels}
          arcs={task.hint >= 2}
          Avatar={props.Avatar}
          expression={props.expression}
          label={`${t("ui.goal-at")} ${goal.n}/${goal.d}`}
        />
      </div>

      <Caption ids={props.caption} t={t} />

      {/* The plan and the hops in one panel, with play beside both. */}
      <div className={styles.deck}>
        <section className={styles.plan} aria-label={t("ui.plan")}>
          <span className={styles.label}>{t("ui.plan")}</span>
          <ol className={styles.slots}>
            {Array.from({ length: course.budget }, (_, i) => {
              const d = task.plan[i];
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions
                <li key={i}>
                  {d === undefined ? (
                    <span
                      className={styles.slot}
                      data-slot="slot"
                      data-testid="empty-slot"
                    />
                  ) : (
                    <button
                      type="button"
                      className={`${styles.block} ${i < task.locked ? styles.locked : ""}`}
                      onClick={() => props.onRemove(i)}
                      disabled={busy || i < task.locked}
                      aria-label={t(`hop.${d}` as StringId)}
                      data-hand={`slot-${i}`}
                      data-testid="planned"
                      data-d={d}
                    >
                      <Frac n={1} d={d} />
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <section className={styles.tray} aria-label={t("ui.hops")}>
          <span className={styles.label}>{t("ui.hops")}</span>
          <div className={styles.blocks}>
            {course.blocks.map((b) => (
              <button
                key={b.d}
                type="button"
                className={styles.block}
                onClick={() => props.onAdd(b.d)}
                disabled={busy}
                aria-label={t(`hop.${b.d}` as StringId)}
                data-hand={`block-${b.d}`}
                data-testid="block"
                data-d={b.d}
              >
                <Frac n={1} d={b.d} />
              </button>
            ))}
          </div>
        </section>
        <button
          type="button"
          className={`${styles.button} ${styles.play}`}
          onClick={props.onPlay}
          disabled={busy}
          data-hand="play"
        >
          <ScreenArt slot="icon-play" size={32} />
          {t("ui.play")}
        </button>
      </div>

      <GhostHand target={props.hand} tapping={props.tapping} />
    </div>
  );
}

/** The last instruction said, with amounts as fraction notation. */
function Caption({
  ids,
  t,
}: {
  ids: readonly StringId[];
  t(id: StringId): string;
}) {
  const parts: ReactNode[] = ids.map((id, i) => {
    const amount = parseAmount(id);
    const next = ids[i + 1];
    // An amount ends its sentence when a new sentence follows it.
    const stop = amount && next && !parseAmount(next) ? "." : "";
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: an instruction can repeat a line
      <Fragment key={i}>
        {i > 0 && " "}
        {amount ? (
          <>
            <Frac {...amount} />
            {stop}
          </>
        ) : (
          t(id)
        )}
      </Fragment>
    );
  });
  return (
    <p className={styles.caption} aria-live="polite" data-testid="caption">
      {parts}
    </p>
  );
}

/**
 * Points at whatever `data-hand` names, for the tutorial and guided. On the
 * lower half of the screen it points down from above, so it never runs off
 * the bottom. `tapping` presses it in.
 */
function GhostHand({
  target,
  tapping,
}: {
  target: string | null;
  tapping: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Where it last pointed, kept while hidden so it fades out in place.
  const [at, setAt] = useState<{
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [shown, setShown] = useState(false);
  // Appearing, it fades in where it points; only moves between targets glide.
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
        // "center": the middle of the screen, a starting point to glide from.
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
  const { anchor } = screenArt["ghost-hand"];
  return (
    <div
      ref={ref}
      className={`${styles.hand} ${appearing ? styles.appearing : ""}`}
      data-testid="ghost-hand"
      data-target={shown && at ? target : undefined}
      data-flipped={at?.flipped || undefined}
      style={{
        transform: at
          ? `translate(${at.x - anchor.x}px, ${at.y - anchor.y}px)`
          : undefined,
        opacity: shown && at ? 1 : 0,
      }}
      aria-hidden="true"
    >
      {/* Turned and pressed about the fingertip, so it stays on its target. */}
      <div
        className={styles.handTurn}
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
