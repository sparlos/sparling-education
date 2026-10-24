// The model prototype: how rough a lab prototype should be, and what its
// meta looks like. Not a candidate game. Copy the shape, not the mechanic.
import { type PointerEvent, useEffect, useState } from "react";
import type { PrototypeMeta, PrototypeProps } from "../prototype.ts";

export const meta: PrototypeMeta = {
  title: "Clothesline",
  pitch:
    "A number card appears. Tap where it hangs on the line, and it swings to where it really goes, next to the cards already pegged up.",
  expectations: ["math-2020.g1.B1.3", "math-2020.g2.B1.2"],
  misconceptions: [
    {
      id: "compares-ones-digits",
      fails:
        "Hanging 29 to the right of 31 because 9 is more than 1: the card swings back left past 31, and the line shows the gap it travelled.",
    },
    {
      id: "spaces-cards-evenly",
      fails:
        "Hanging each new card just past the last one, whatever its value: the cards swing out to their real places, leaving big and small gaps.",
    },
  ],
  sampleTask:
    "math-2020.g2.B1.2, sample task 2: hanging number cards on a clothesline marked with benchmark numbers.",
  fun: "A guessing game with instant, physical feedback, like the pin drop in GeoGuessr: you see exactly how far off you were, and want to beat it next card.",
  isArchived: true,
};

const cardsPerRound = 6;
// The line in viewBox units.
const left = 50;
const right = 950;
const lineY = 160;

interface Hung {
  value: number;
  guess: number;
}

const ask = (card: number) => `Where does ${card} go? Tap the line.`;

function nextCard(max: number, hung: readonly Hung[]): number {
  for (;;) {
    const value = 1 + Math.floor(Math.random() * (max - 1));
    if (!hung.some((card) => card.value === value)) return value;
  }
}

export default function Clothesline({ grade, Avatar, speak }: PrototypeProps) {
  const max = grade <= 1 ? 50 : 200;
  const step = max === 50 ? 10 : 50;
  const [hung, setHung] = useState<Hung[]>([]);
  const [card, setCard] = useState(() => nextCard(max, []));
  const [mood, setMood] = useState<"thinking" | "happy" | "encouraging">(
    "thinking",
  );
  const done = hung.length >= cardsPerRound;
  const x = (value: number) => left + ((right - left) * value) / max;

  // The first card is asked for here; later ones follow the feedback in one
  // line, so the next question doesn't cut the feedback off.
  const [first] = useState(card);
  useEffect(() => speak(ask(first)), [first, speak]);

  const place = (event: PointerEvent<SVGSVGElement>) => {
    if (done) return;
    const box = event.currentTarget.getBoundingClientRect();
    const at = ((event.clientX - box.left) / box.width) * 1000;
    const guess = Math.round(
      Math.min(max, Math.max(0, ((at - left) / (right - left)) * max)),
    );
    const off = Math.abs(guess - card);
    const close = off <= max / 20;
    setMood(close ? "happy" : "encouraging");
    const feedback = close
      ? "Spot on!"
      : `It goes over here. You were ${off} away.`;
    const next = [...hung, { value: card, guess }];
    setHung(next);
    if (next.length < cardsPerRound) {
      const following = nextCard(max, next);
      setCard(following);
      speak(`${feedback} ${ask(following)}`);
    } else {
      speak(`${feedback} That's the whole line!`);
    }
  };

  const last = hung[hung.length - 1];
  const ticks = Array.from({ length: max / step + 1 }, (_, i) => i * step);

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        padding: 24,
        justifyItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Avatar expression={done ? "cheering" : mood} size={96} />
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            padding: "8px 24px",
            borderRadius: 12,
            background: "var(--k-surface-raised)",
            border: "3px solid var(--k-border-strong)",
            minWidth: 120,
            textAlign: "center",
          }}
        >
          {done ? "Done!" : card}
        </div>
      </div>
      <svg
        viewBox="0 0 1000 300"
        style={{ width: "100%", maxWidth: 1100, touchAction: "none" }}
        role="img"
        aria-label={`A number line from 0 to ${max}`}
        onPointerDown={place}
      >
        <rect x={0} y={0} width={1000} height={300} fill="transparent" />
        <line
          x1={left}
          x2={right}
          y1={lineY}
          y2={lineY}
          stroke="var(--k-ink)"
          strokeWidth={6}
        />
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={x(tick)}
              x2={x(tick)}
              y1={lineY - 14}
              y2={lineY + 14}
              stroke="var(--k-ink)"
              strokeWidth={4}
            />
            <text
              x={x(tick)}
              y={lineY + 50}
              textAnchor="middle"
              fontSize={28}
              fill="var(--k-ink-muted)"
            >
              {tick}
            </text>
          </g>
        ))}
        {last && (
          <path
            d={`M ${x(last.guess)} ${lineY - 30} Q ${(x(last.guess) + x(last.value)) / 2} ${lineY - 120} ${x(last.value)} ${lineY - 30}`}
            fill="none"
            stroke="var(--k-ink-muted)"
            strokeWidth={4}
            strokeDasharray="10 8"
          />
        )}
        {hung.map((h) => (
          <g key={h.value}>
            <rect
              x={x(h.value) - 30}
              y={lineY - 70}
              width={60}
              height={44}
              rx={6}
              fill="var(--k-surface-raised)"
              stroke="var(--k-border-strong)"
              strokeWidth={3}
            />
            <text
              x={x(h.value)}
              y={lineY - 38}
              textAnchor="middle"
              fontSize={26}
              fontWeight={700}
              fill="var(--k-ink)"
            >
              {h.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
