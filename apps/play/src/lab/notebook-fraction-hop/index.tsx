// The rough notebook over a rough Fraction Hop screen, with the controls along
// the bottom, so the notebook has to shrink and be dragged clear of them.
// Throwaway; see ../notebook-kit.tsx.
import { palette } from "@repo/tokens";
import { useEffect, useRef, useState } from "react";
import { wait } from "../add-sub-kit.tsx";
import {
  type Notebook,
  NotebookPiece,
  NotebookScreen,
} from "../notebook-kit.tsx";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Notebook over Fraction Hop",
  pitch:
    "Not a game: a test of the notebook when a game's controls run along the bottom. Open it, work something out, shrink it to a card, and drag the card clear of the hops and Go.",
  expectations: ["math-2020.g3.B2.8", "math-2020.g4.B1.6", "math-2020.g5.B1.3"],
  misconceptions: [
    {
      id: "counts-without-the-unit",
      fails:
        "Planning three ¼ hops to reach a goal at ³⁄₈: the avatar goes past it, or into the water. The notebook gives a place to work out what the hops add up to.",
    },
  ],
  fun: "This one tests comfort, not fun: can a student get the notebook out of the way and still read it?",
  isArchived: true,
};

interface Fraction {
  n: number;
  d: number;
}

interface Task {
  goal: Fraction;
  /** Ticks per whole; positions below are counted in these. */
  ticks: number;
  wholes: number;
  stones: number[];
  blocks: Fraction[];
  budget: number;
}

const tasks: Task[] = [
  {
    goal: { n: 3, d: 8 },
    ticks: 8,
    wholes: 2,
    stones: [0, 1, 2, 3, 4, 7, 8, 9, 12, 16],
    blocks: [
      { n: 1, d: 8 },
      { n: 1, d: 4 },
      { n: 1, d: 1 },
    ],
    budget: 4,
  },
  {
    goal: { n: 7, d: 4 },
    ticks: 4,
    wholes: 3,
    stones: [0, 1, 4, 5, 6, 7, 8, 10, 12],
    blocks: [
      { n: 1, d: 4 },
      { n: 1, d: 2 },
      { n: 1, d: 1 },
    ],
    budget: 5,
  },
  {
    goal: { n: 2, d: 3 },
    ticks: 12,
    wholes: 2,
    stones: [0, 3, 4, 6, 8, 12, 15, 16, 20, 24],
    blocks: [
      { n: 1, d: 12 },
      { n: 1, d: 6 },
      { n: 1, d: 4 },
      { n: 1, d: 3 },
      { n: 1, d: 1 },
    ],
    budget: 2,
  },
];

const unitsOf = (f: Fraction, ticks: number) => (f.n * ticks) / f.d;

function Stacked({ value, size }: { value: Fraction; size: number }) {
  if (value.d === 1) {
    return <span style={{ fontSize: size, fontWeight: 900 }}>{value.n}</span>;
  }
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.05,
      }}
    >
      <span>{value.n}</span>
      <span
        style={{
          borderTop: `3px solid ${palette.ink[9]}`,
          alignSelf: "stretch",
          textAlign: "center",
        }}
      >
        {value.d}
      </span>
    </span>
  );
}

function GoalPicture({ goal }: { goal: Fraction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 20, fontWeight: 700 }}>Reach</span>
      <Stacked value={goal} size={22} />
    </div>
  );
}

/** A fraction on the page: nothing like a number's row of squares. */
function FractionPiece({ value }: { value: Fraction }) {
  return (
    <div style={{ padding: "4px 12px", color: palette.ink[9] }}>
      <Stacked value={value} size={28} />
    </div>
  );
}

/** What the notebook shows: the goal and the hops, all draggable onto the page. */
function HopPicture({ task }: { task: Task }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 20, fontWeight: 700 }}>Reach</span>
      <NotebookPiece content={<FractionPiece value={task.goal} />}>
        <Stacked value={task.goal} size={22} />
      </NotebookPiece>
      <span style={{ fontSize: 16, fontWeight: 700, marginLeft: 12 }}>
        with
      </span>
      {task.blocks.map((f) => (
        <NotebookPiece
          key={`${f.n}-${f.d}`}
          content={<FractionPiece value={f} />}
        >
          <div
            style={{
              padding: "2px 8px",
              minWidth: 32,
              textAlign: "center",
              borderRadius: 8,
              background: "white",
              border: `2px solid ${palette.ink[4]}`,
            }}
          >
            <Stacked value={f} size={18} />
          </div>
        </NotebookPiece>
      ))}
    </div>
  );
}

function Hop({
  Avatar,
  speak,
  notebook,
}: PrototypeProps & { notebook: Notebook }) {
  const [index, setIndex] = useState(0);
  const [plan, setPlan] = useState<Fraction[]>([]);
  const [at, setAt] = useState(0);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [reached, setReached] = useState(false);
  const alive = useRef(true);
  const task = tasks[index] as Task;
  const total = task.ticks * task.wholes;
  const goalAt = unitsOf(task.goal, task.ticks);
  const x = (units: number) => `${4 + (units / total) * 92}%`;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    setPlan([]);
    setAt(0);
    setMessage("");
    setReached(false);
    notebook.task(task, <HopPicture task={task} />);
    speak(`Hop to ${task.goal.n} over ${task.goal.d}.`);
  }, [task, notebook, speak]);

  const go = async () => {
    notebook.close();
    setRunning(true);
    setMessage("");
    let cur = 0;
    setAt(0);
    await wait(300);
    for (const hop of plan) {
      cur += unitsOf(hop, task.ticks);
      setAt(cur);
      await wait(650);
      if (!alive.current) return;
      if (!task.stones.includes(cur)) {
        setRunning(false);
        setMessage("Splash! That hop landed in the water.");
        return;
      }
    }
    setRunning(false);
    if (cur === goalAt) {
      setReached(true);
      setMessage("You found the goal!");
    } else {
      setMessage(cur > goalAt ? "You went past the goal." : "Not there yet.");
    }
  };

  const block = (f: Fraction, onClick: () => void, key: string) => (
    <button
      key={key}
      type="button"
      disabled={running || reached}
      onClick={onClick}
      style={{
        width: 72,
        height: 72,
        borderRadius: 12,
        border: `2px solid ${palette.sky[7]}`,
        background: palette.sky[0],
        color: palette.ink[9],
        touchAction: "manipulation",
      }}
    >
      <Stacked value={f} size={20} />
    </button>
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 16px",
          minHeight: 72,
        }}
      >
        <Avatar expression={reached ? "cheering" : "thinking"} size={56} />
        <GoalPicture goal={task.goal} />
        <span style={{ fontSize: 20, fontWeight: 700 }}>{message}</span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: palette.sky[2],
        }}
      >
        {task.stones.map((s) => (
          <div
            key={s}
            style={{
              position: "absolute",
              left: x(s),
              bottom: 48,
              width: 44,
              height: 16,
              marginLeft: -22,
              borderRadius: 8,
              background: palette.leaf[5],
            }}
          />
        ))}
        {Array.from({ length: total + 1 }, (_, t) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed ticks
            key={t}
            style={{
              position: "absolute",
              left: x(t),
              bottom: 16,
              width: 2,
              height: t % task.ticks === 0 ? 28 : 14,
              background: palette.ink[7],
            }}
          />
        ))}
        {Array.from({ length: task.wholes + 1 }, (_, w) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed labels
            key={w}
            style={{
              position: "absolute",
              left: x(w * task.ticks),
              bottom: -2,
              marginLeft: -6,
              fontSize: 15,
              fontWeight: 700,
              color: palette.ink[9],
            }}
          >
            {w}
          </div>
        ))}
        {reached && (
          <div
            style={{
              position: "absolute",
              left: x(goalAt),
              bottom: 120,
              marginLeft: -14,
              fontSize: 28,
            }}
          >
            ⚑
          </div>
        )}
        <div
          style={{
            position: "absolute",
            left: x(at),
            bottom: 64,
            marginLeft: -28,
            transition: "left 500ms ease-in-out",
          }}
        >
          <Avatar expression={reached ? "cheering" : "happy"} size={56} />
        </div>
      </div>

      <div
        data-hop-controls
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 16px",
          background: palette.sand[0],
          borderTop: `1px solid ${palette.ink[2]}`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {Array.from({ length: task.budget }, (_, i) => {
            const planned = plan[i];
            return planned ? (
              block(
                planned,
                () => setPlan(plan.filter((_, j) => j !== i)),
                `plan-${i}`,
              )
            ) : (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed slots
                key={i}
                style={{
                  width: 72,
                  height: 72,
                  boxSizing: "border-box",
                  borderRadius: 12,
                  border: `2px dashed ${palette.ink[4]}`,
                }}
              />
            );
          })}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 6 }}>
          {task.blocks.map((f) =>
            block(
              f,
              () => {
                if (plan.length < task.budget) setPlan([...plan, f]);
              },
              `block-${f.n}-${f.d}`,
            ),
          )}
        </div>
        <button
          type="button"
          disabled={running || (plan.length === 0 && !reached)}
          onClick={reached ? () => setIndex((index + 1) % tasks.length) : go}
          style={{
            minWidth: 120,
            height: 72,
            fontSize: 24,
            fontWeight: 800,
            borderRadius: 14,
            border: "none",
            color: "white",
            background: reached ? palette.leaf[6] : palette.sky[6],
            opacity: running ? 0.5 : 1,
            touchAction: "manipulation",
          }}
        >
          {reached ? "Next →" : "Go ▶"}
        </button>
      </div>
    </div>
  );
}

export default function NotebookOverFractionHop(props: PrototypeProps) {
  return (
    <NotebookScreen>
      {(notebook) => <Hop {...props} notebook={notebook} />}
    </NotebookScreen>
  );
}
