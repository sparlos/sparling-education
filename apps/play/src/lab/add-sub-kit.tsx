// Shared bits for the addition and subtraction prototypes (cargo-line,
// lift-bridge, belt-factory): the amounts each grade works with, a number
// pad, and the screen layout. Rough; see README.md.
import { palette } from "@repo/tokens";
import type { CSSProperties, ReactNode } from "react";

export const rand = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1));

/**
 * What one task's amounts look like. Amounts are kept as whole counts of the
 * smallest unit (hundredths at dp 2), so the arithmetic stays exact.
 */
export interface Kind {
  /** Decimal places: 0 whole numbers, 1 tenths, 2 hundredths. */
  dp: number;
  /** The biggest amount, in units. */
  max: number;
}

/** Grade 3 whole numbers to 1000; Grades 4 and 5 alternate whole numbers and decimals. */
export function kindFor(grade: number, round: number): Kind {
  if (grade <= 3) return { dp: 0, max: 1000 };
  const decimal = round % 2 === 1;
  if (grade === 4)
    return decimal ? { dp: 1, max: 1000 } : { dp: 0, max: 10000 };
  return decimal ? { dp: 2, max: 10000 } : { dp: 0, max: 100000 };
}

/**
 * A random amount between lo and hi units (null if there's no room), with a
 * non-zero last digit so sums and differences need regrouping more often.
 * At hundredths, some amounts are tenths only (0.4 beside 2.18).
 */
export function amount(kind: Kind, lo: number, hi: number): number | null {
  const a = Math.ceil(lo);
  const b = Math.floor(hi);
  if (b < a) return null;
  let v = rand(a, b);
  if (kind.dp === 2 && Math.random() < 0.4) {
    v = Math.round(v / 10) * 10;
    if (v % 100 === 0) v += 10;
  } else if (v % 10 === 0) v += rand(1, 9);
  return v < a || v > b ? null : v;
}

/** How an amount is written: 52 310, 2.4, 2.18 (no trailing zeros). */
export function fmt(units: number, dp: number): string {
  if (dp > 0) return String(Number((units / 10 ** dp).toFixed(dp)));
  return Math.abs(units) >= 10000
    ? units.toLocaleString("en-CA").replace(/,/g, " ")
    : String(units);
}

/** What the number pad's text is worth in units, or null when it's empty. */
export function toUnits(text: string, dp: number): number | null {
  if (text === "" || text === ".") return null;
  return Math.round(Number.parseFloat(text) * 10 ** dp);
}

const key: CSSProperties = {
  minWidth: 64,
  minHeight: 56,
  fontSize: 26,
  fontWeight: 800,
  borderRadius: 12,
  border: `2px solid ${palette.ink[4]}`,
  background: palette.sand[0],
  color: palette.ink[9],
  touchAction: "manipulation",
};

/** 0–9, a decimal point when the task has decimals, and delete. */
export function NumberPad({
  value,
  onChange,
  dp,
  maxDigits,
  disabled,
}: {
  value: string;
  onChange(value: string): void;
  dp: number;
  maxDigits: number;
  disabled?: boolean;
}) {
  const press = (k: string) => {
    if (disabled) return;
    if (k === "del") return onChange(value.slice(0, -1));
    if (k === ".") {
      if (dp === 0 || value.includes(".")) return;
      return onChange(`${value || "0"}.`);
    }
    const [whole = "", frac] = value.split(".");
    if (frac !== undefined) {
      if (frac.length >= dp) return;
    } else if (whole.length >= maxDigits) return;
    onChange(value === "0" ? k : value + k);
  };
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {[...keys, dp > 0 ? "." : "", "0", "del"].map((k) =>
        k === "" ? (
          <span key="blank" />
        ) : (
          <button
            key={k}
            type="button"
            style={key}
            disabled={disabled}
            onClick={() => press(k)}
            aria-label={k === "del" ? "Delete" : k}
          >
            {k === "del" ? "⌫" : k}
          </button>
        ),
      )}
    </div>
  );
}

export function BigButton({
  children,
  onClick,
  disabled,
  tone = "go",
}: {
  children: ReactNode;
  onClick(): void;
  disabled?: boolean;
  tone?: "go" | "next";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 64,
        minWidth: 180,
        fontSize: 26,
        fontWeight: 800,
        borderRadius: 16,
        border: "none",
        color: "white",
        background: tone === "next" ? palette.leaf[6] : palette.sky[6],
        opacity: disabled ? 0.5 : 1,
        touchAction: "manipulation",
      }}
    >
      {children}
    </button>
  );
}

/** The screen: avatar, caption and progress on top; the scene; an optional side panel. */
export function Stage({
  avatar,
  caption,
  progress,
  action,
  scene,
  side,
}: {
  avatar: ReactNode;
  caption: string;
  progress: string;
  action?: ReactNode;
  scene: ReactNode;
  side?: ReactNode;
}) {
  return (
    <div
      style={{
        height: "100%",
        maxWidth: 1366,
        margin: "0 auto",
        padding: "6px 16px 10px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {avatar}
        <div
          data-caption
          style={{
            flex: 1,
            fontSize: 21,
            fontWeight: 700,
            lineHeight: 1.3,
            color: palette.ink[9],
          }}
        >
          {caption}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: palette.ink[6] }}>
          {progress}
        </div>
        {action}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{scene}</div>
        {side && (
          <div
            style={{
              width: 228,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 12,
            }}
          >
            {side}
          </div>
        )}
      </div>
    </div>
  );
}

export const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));
