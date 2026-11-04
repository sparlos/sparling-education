// One course in the game frame: the goal, the course, the caption, the plan
// and the hop blocks. The tutorial and real tasks both render it; only
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
import { GameFrame } from "@repo/game-kit/frame";
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
import { ScreenArt } from "./art.tsx";
import { type Arrival, Course, type Hopper } from "./Course.tsx";
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
  /** The tutorial's skip button. */
  onSkip?: () => void;
  /** The journey, laid over the whole board. */
  overlay?: ReactNode;
  /** Set while the course comes on screen, with the controls hidden. */
  arrival?: Arrival | null;
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
    <DragDropProvider
      sensors={sensors}
      onDragEnd={(event) => drop(event, props)}
    >
      <GameFrame
        t={t}
        stageOnly={Boolean(props.arrival)}
        info={
          <div className={styles.goal} data-hand="goal">
            <span>{t("ui.goal-at")}</span>
            <span className={styles.goalChip} data-testid="goal-at">
              <Frac {...goal} />
            </span>
          </div>
        }
        hint={{
          onTap: props.onHint,
          disabled: busy,
          glow: task.glow,
          level: task.hint,
        }}
        onSkip={props.onSkip}
        stage={
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
              arrival={props.arrival}
              label={`${t("ui.goal-at")} ${goal.n}/${goal.d}`}
            />
          </div>
        }
        caption={
          props.caption.length > 0 ? <Caption ids={props.caption} t={t} /> : ""
        }
        deckTop={
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
        }
        deck={
          <Tray busy={busy} t={t} blocks={course.blocks} onAdd={props.onAdd} />
        }
        main={{ label: t("ui.play"), onTap: props.onPlay, disabled: busy }}
        hand={props.hand}
        tapping={props.tapping}
        carrying={
          props.carrying ? (
            <span
              className={`${styles.block} ${styles.lifted}`}
              data-testid="carried"
            >
              <Frac n={1} d={props.carrying.d} />
            </span>
          ) : undefined
        }
      >
        {/* The block under the finger while it's dragged. */}
        <DragOverlay dropAnimation={null} className={styles.overlay}>
          {(source) => (
            <span className={`${styles.block} ${styles.lifted}`}>
              <Frac n={1} d={(source.data as Dragged).d} />
            </span>
          )}
        </DragOverlay>
        {props.sparkle && (
          <Sparkle
            key={props.sparkle.key}
            target={`slot-${props.sparkle.hop}`}
          />
        )}
        {props.overlay}
      </GameFrame>
    </DragDropProvider>
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
  return <span className={styles.captionParts}>{parts}</span>;
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
        <span
          className={styles.fixPop}
          data-testid="burst"
          style={{ left: at.x, top: at.y }}
        >
          <ScreenArt slot="sparkle" size={120} />
        </span>
      )}
    </span>
  );
}
