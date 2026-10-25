// The whole screen for one course: the goal, the course, the caption, the
// plan and the hop blocks. The tutorial and real tasks both render it; only
// who taps differs.

import { PointerActivationConstraints } from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import type { AvatarExpression } from "@repo/game-contract";
import { Burst } from "@repo/game-kit/burst";
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
  /** A block the ghost hand is dragging, in the tutorial. */
  carrying?: Carried | null;
  /** How many of the plan's hops the run has taken off on, for its trail. */
  trail: number;
  /** The planned hop that splashed on the last run, marked until the plan changes. */
  missed?: number | null;
  /** "Nice fix!": the plan slot to sparkle on; a new `key` bursts again. */
  sparkle?: { hop: number; key: number } | null;
  /** A hop block tapped (at the end) or dropped into the plan (at `at`). */
  onAdd(d: number, at?: number): void;
  onRemove(i: number): void;
  /** A planned block dragged to another place in the plan. */
  onMove(from: number, to: number): void;
  onPlay(): void;
  onHint(): void;
  /** The tutorial's skip button, in place of the hint button. */
  onSkip?: () => void;
}

export function Board(props: BoardProps) {
  const { task, t } = props;
  // The planned hop in the air, lit while it runs.
  const hopping = props.running ? props.hopper.flight?.key : undefined;
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
          trail={props.trail}
          Avatar={props.Avatar}
          expression={props.expression}
          label={`${t("ui.goal-at")} ${goal.n}/${goal.d}`}
        />
      </div>

      <Caption ids={props.caption} t={t} />

      {/* The plan and the hops in one panel, with play beside both. */}
      <DragDropProvider
        sensors={sensors}
        onDragEnd={(event) => drop(event, props)}
      >
        <div className={styles.deck}>
          <section className={styles.plan} aria-label={t("ui.plan")}>
            <span className={styles.label}>{t("ui.plan")}</span>
            <ol className={styles.slots}>
              {Array.from({ length: course.budget }, (_, i) => (
                <PlanSlot
                  // biome-ignore lint/suspicious/noArrayIndexKey: slots are positions
                  key={i}
                  i={i}
                  d={task.plan[i]}
                  locked={i < task.locked}
                  carried={props.carrying?.from === i}
                  fixed={props.sparkle?.hop === i}
                  state={
                    hopping === i
                      ? "hopping"
                      : props.missed === i
                        ? "missed"
                        : undefined
                  }
                  busy={busy}
                  t={t}
                  onRemove={props.onRemove}
                />
              ))}
            </ol>
          </section>

          <Tray busy={busy} t={t} blocks={course.blocks} onAdd={props.onAdd} />
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
        {/* The block under the finger while it's dragged. */}
        <DragOverlay dropAnimation={null} className={styles.overlay}>
          {(source) => (
            <span className={`${styles.block} ${styles.lifted}`}>
              <Frac n={1} d={(source.data as Dragged).d} />
            </span>
          )}
        </DragOverlay>
      </DragDropProvider>

      {props.sparkle && (
        <Sparkle key={props.sparkle.key} target={`slot-${props.sparkle.hop}`} />
      )}
      <GhostHand
        target={props.hand}
        tapping={props.tapping}
        carrying={props.carrying?.d ?? null}
      />
    </div>
  );
}

/** What's being dragged: a hop from the tray, or a planned hop at `i`. */
type Dragged = { d: number; i?: number };

/** What the ghost hand drags: a hop from the tray, or a planned hop at `from`. */
export type Carried = { d: number; from?: number };

// A drag starts once a finger or pointer moves 8 px, so a tap stays a tap.
// The library's default for touch waits for a long press, which children
// skip: they press and drag at once.
const sensors = [
  PointerSensor.configure({
    activationConstraints: [
      new PointerActivationConstraints.Distance({ value: 8 }),
    ],
  }),
  KeyboardSensor,
];

/**
 * Where a drag ended: a tray hop dropped on a slot goes there, a planned
 * hop dropped on a slot moves there, and a planned hop dropped back on the
 * tray comes out of the plan. Anywhere else, it springs back.
 */
function drop(event: DragEndEvent, props: BoardProps) {
  const { source, target } = event.operation;
  if (event.canceled || !source || !target) return;
  const { d, i } = source.data as Dragged;
  const to = String(target.id);
  if (to === "tray") {
    if (i !== undefined) props.onRemove(i);
  } else if (to.startsWith("slot-")) {
    const at = Number(to.slice(5));
    if (i === undefined) props.onAdd(d, at);
    else props.onMove(i, at);
  }
}

/** One place in the plan: an empty slot, or a hop that can be tapped out or dragged. */
function PlanSlot({
  i,
  d,
  locked,
  carried,
  fixed,
  state,
  busy,
  t,
  onRemove,
}: {
  i: number;
  d: number | undefined;
  locked: boolean;
  /** The ghost hand is dragging this hop. */
  carried: boolean;
  /** This hop just earned a "Nice fix!". */
  fixed: boolean;
  /** In the air on this run, or the hop that splashed on the last one. */
  state?: "hopping" | "missed";
  busy: boolean;
  t(id: StringId): string;
  onRemove(i: number): void;
}) {
  const target = useDroppable({ id: `slot-${i}`, disabled: busy });
  const drag = useDraggable<Dragged>({
    id: `plan-${i}`,
    data: { d: d ?? 0, i },
    disabled: busy || locked || d === undefined,
  });
  const over = target.isDropTarget ? styles.over : "";
  return (
    <li ref={target.ref}>
      {d === undefined ? (
        <span
          className={`${styles.slot} ${over}`}
          data-slot="slot"
          data-hand={`slot-${i}`}
          data-testid="empty-slot"
        />
      ) : (
        <button
          ref={drag.ref}
          type="button"
          className={`${styles.block} ${locked ? styles.locked : ""} ${over} ${drag.isDragSource || carried ? styles.source : ""} ${fixed ? styles.fixed : ""} ${state ? styles[state] : ""}`}
          data-state={state}
          onClick={() => onRemove(i)}
          disabled={busy || locked}
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
}

/** The hops on offer: tap one to add it to the plan, or drag it to a slot. */
function Tray({
  blocks,
  busy,
  t,
  onAdd,
}: {
  blocks: readonly { d: number }[];
  busy: boolean;
  t(id: StringId): string;
  onAdd(d: number): void;
}) {
  // A planned hop dragged back here comes out of the plan. Only a planned
  // hop: a tray hop starts over the tray, and mustn't light it up.
  const target = useDroppable({
    id: "tray",
    disabled: busy,
    accept: (source) => (source.data as Dragged).i !== undefined,
  });
  return (
    <section
      ref={target.ref}
      className={`${styles.tray} ${target.isDropTarget ? styles.trayOver : ""}`}
      aria-label={t("ui.hops")}
    >
      <span className={styles.label}>{t("ui.hops")}</span>
      <div className={styles.blocks}>
        {blocks.map((b) => (
          <TrayBlock key={b.d} d={b.d} busy={busy} t={t} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

function TrayBlock({
  d,
  busy,
  t,
  onAdd,
}: {
  d: number;
  busy: boolean;
  t(id: StringId): string;
  onAdd(d: number): void;
}) {
  const drag = useDraggable<Dragged>({
    id: `tray-${d}`,
    data: { d },
    disabled: busy,
  });
  return (
    <button
      ref={drag.ref}
      type="button"
      className={styles.block}
      onClick={() => onAdd(d)}
      disabled={busy}
      aria-label={t(`hop.${d}` as StringId)}
      data-hand={`block-${d}`}
      data-testid="block"
      data-d={d}
    >
      <Frac n={1} d={d} />
    </button>
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

/** The "Nice fix!" burst of sparkles, centred on what `data-hand` names. */
function Sparkle({ target }: { target: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const root = ref.current?.parentElement;
    const el = root?.querySelector(`[data-hand="${target}"]`);
    if (!root || !el) return;
    const box = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setAt({
      x: r.left - box.left + r.width / 2,
      y: r.top - box.top + r.height / 2,
    });
  }, [target]);
  return (
    // Laid over the whole board, out of its grid, so it never takes a row.
    <span ref={ref} className={styles.layer}>
      {at && (
        <Burst x={at.x} y={at.y} count={12} spread={80} duration={800}>
          <ScreenArt slot="sparkle" size={34} />
        </Burst>
      )}
    </span>
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
  carrying,
}: {
  target: string | null;
  tapping: boolean;
  /** The hop it's dragging, held under its fingertip. */
  carrying: number | null;
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
      {carrying !== null && (
        <span
          className={`${styles.block} ${styles.lifted} ${styles.carried}`}
          data-testid="carried"
          style={{ left: anchor.x - 36, top: anchor.y - 36 }}
        >
          <Frac n={1} d={carrying} />
        </span>
      )}
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
