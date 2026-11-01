// The screen every game is laid out in, so the controls a student learns in
// one game are the same, in the same place, in the next. A game fills the
// frame's areas; it can't move or restyle what the frame draws:
//
// - Hint (or Skip, during the tutorial) in the top-right corner
// - the main button (Play, Run, Go) in the bottom-right corner
// - the caption directly under the play area
// - the ghost hand, and the number pad wherever a game has one
//
// Give `side` for controls in a column on the right, or `deck` for controls in
// a panel along the bottom. The shell's progress strip and rail sit outside.
import { palette } from "@repo/tokens";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { type Slot, SlotImage } from "./art.tsx";
import styles from "./frame.module.css";
import type { FrameStringId } from "./frame-strings.ts";

const ink = palette.ink[9];

export const frameArt = {
  /** The hint button's light bulb. */
  "icon-hint": {
    width: 32,
    height: 32,
    anchor: { x: 16, y: 16 },
    draw: () => (
      <>
        <path
          d="M16 3 a9 9 0 0 1 5 16.5 V23 H11 V19.5 A9 9 0 0 1 16 3 z"
          fill={palette.sunshine[3]}
          stroke={ink}
          strokeWidth="2.5"
        />
        <rect x="11" y="25" width="10" height="4" rx="2" fill={ink} />
      </>
    ),
  },
  /** The main button's triangle. */
  "icon-main": {
    width: 32,
    height: 32,
    anchor: { x: 16, y: 16 },
    draw: () => <path d="M9 5 L27 16 L9 27 Z" fill="currentColor" />,
  },
  /** The pointing hand, its fingertip at the anchor. */
  "ghost-hand": {
    width: 64,
    height: 64,
    anchor: { x: 22, y: 4 },
    draw: () => (
      <path
        d="M18 30 V8 a5 5 0 0 1 10 0 V26 V22 a5 5 0 0 1 10 0 V28 V25 a5 5 0 0 1 10 0 V31 a5 5 0 0 1 10 0 V44 c0 10 -8 18 -18 18 h-6 c-6 0 -11 -3 -14 -8 L8 40 a5 5 0 0 1 8 -6 z"
        fill="white"
        stroke={ink}
        strokeWidth="3"
        strokeLinejoin="round"
        opacity="0.92"
      />
    ),
  },
} satisfies Record<string, Slot>;

/** How long the hand takes to reach a target: its CSS transition, plus a beat. */
export const handMs = 750;
/** How long the hand waits mid-screen before gliding to the hint button. */
const nudgeMs = 450;
/** How long the hand stays on the hint button before fading. */
const nudgeHoldMs = 2000;

/**
 * Offers a hint: while the voice says the offer, the hand glides from the
 * middle of the screen to the glowing button, and fades soon after, so it
 * invites a tap without demanding one. Say the miss's result first.
 */
export async function offerHint({
  say,
  pause,
  setHand,
}: {
  /** Says the offer; settles when it's been said. */
  say(): Promise<unknown>;
  pause(ms: number): Promise<unknown>;
  setHand: Dispatch<SetStateAction<string | null>>;
}): Promise<void> {
  setHand("center");
  const offered = say();
  await pause(nudgeMs);
  setHand((at) => (at === "center" ? "hint" : at));
  await Promise.all([offered, pause(handMs)]);
  await pause(nudgeHoldMs);
  setHand((at) => (at === "hint" ? null : at));
}

export interface GameFrameHint {
  onTap(): void;
  disabled?: boolean;
  /** The button is offering itself, after misses. */
  glow?: boolean;
  /** How many hints are on, for a game with more than one. */
  level?: number;
}

export interface GameFrameMain {
  /** What it's called in this game: Play, Run, Go. */
  label: string;
  onTap(): void;
  disabled?: boolean;
}

export type GameFrameProps = {
  /** The top-left corner: what this task asks for. */
  info?: ReactNode;
  /** The play area, which takes whatever room the controls leave. */
  stage: ReactNode;
  /** What was last said, shown under the play area. */
  caption: ReactNode;
  main?: GameFrameMain;
  /** What the ghost hand points at: a `data-hand` value, or "center". */
  hand?: string | null;
  /** The ghost hand is pressing what it points at. */
  tapping?: boolean;
  /** Held under the ghost hand's fingertip, in a tutorial that drags. */
  carrying?: ReactNode;
  /** Layers over the whole screen, out of its layout: effects, drag overlays. */
  children?: ReactNode;
} & (
  | { side?: ReactNode; deck?: undefined; deckTop?: undefined }
  | {
      side?: undefined;
      /** Controls along the bottom, beside the main button. */
      deck?: ReactNode;
      /** A full-width row above them, in the same panel. */
      deckTop?: ReactNode;
    }
) &
  (
    | { t?: undefined; hint?: undefined; onSkip?: undefined }
    | {
        t(id: FrameStringId): string;
        hint?: GameFrameHint;
        /** The tutorial is on: Skip takes the hint button's place. */
        onSkip?: () => void;
      }
  );

export function GameFrame(props: GameFrameProps) {
  const { hint, main, onSkip, t } = props;
  const hasSide = props.side !== undefined;
  const hasDeck =
    !hasSide &&
    (props.deck !== undefined ||
      props.deckTop !== undefined ||
      main !== undefined);
  const mainButton = main && (
    <button
      type="button"
      className={`${styles.button} ${styles.main}`}
      onClick={main.onTap}
      disabled={main.disabled}
      data-hand="main"
      data-testid="main"
    >
      <SlotImage id="icon-main" slot={frameArt["icon-main"]} size={32} />
      {main.label}
    </button>
  );
  return (
    <div
      className={styles.frame}
      data-tone="student"
      data-testid="board"
      data-layout={hasSide ? "side" : "deck"}
      data-info={props.info !== undefined || undefined}
      // In the tutorial the controls are off but look on, so the hand's taps look real.
      data-demo={onSkip ? true : undefined}
    >
      {props.info !== undefined && (
        <header className={styles.info}>{props.info}</header>
      )}
      <div className={styles.corner}>
        {t && onSkip && (
          <button
            type="button"
            className={styles.button}
            onClick={onSkip}
            data-testid="skip"
          >
            {t("ui.skip")}
          </button>
        )}
        {t && hint && !onSkip && (
          <button
            type="button"
            className={styles.button}
            onClick={hint.onTap}
            disabled={hint.disabled}
            data-glow={hint.glow || undefined}
            data-hand="hint"
            data-testid="hint"
            data-hint-level={hint.level}
          >
            <SlotImage id="icon-hint" slot={frameArt["icon-hint"]} size={32} />
            {t("ui.hint")}
          </button>
        )}
      </div>
      <div className={styles.stage}>{props.stage}</div>
      <p className={styles.caption} aria-live="polite" data-testid="caption">
        {props.caption}
      </p>
      {hasSide && (
        <section className={styles.rail}>
          <div className={styles.side}>{props.side}</div>
          {mainButton}
        </section>
      )}
      {hasDeck && (
        <section className={styles.deck}>
          {props.deckTop !== undefined && (
            <div className={styles.deckTop}>{props.deckTop}</div>
          )}
          <div className={styles.deckControls}>{props.deck}</div>
          {mainButton}
        </section>
      )}
      {props.children}
      <GhostHand
        target={props.hand ?? null}
        tapping={props.tapping ?? false}
        carrying={props.carrying}
      />
    </div>
  );
}

export type PadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "."
  | "del";

const padKeys: PadKey[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "del",
];

/** The number pad: 1 2 3 on top, like a phone, and delete right of 0. */
export function NumberPad({
  disabled,
  decimal = false,
  onKey,
}: {
  disabled?: boolean;
  /** Offer a decimal point, left of 0. */
  decimal?: boolean;
  onKey(key: PadKey): void;
}) {
  return (
    <div className={styles.pad} data-testid="pad">
      {padKeys.map((k) =>
        k === "." && !decimal ? (
          <span key={k} />
        ) : (
          <button
            key={k}
            type="button"
            className={styles.key}
            data-testid="key"
            data-key={k}
            data-hand={`key-${k}`}
            disabled={disabled}
            aria-label={k === "del" ? "⌫" : k}
            onClick={() => onKey(k)}
          >
            {k === "del" ? "⌫" : k}
          </button>
        ),
      )}
    </div>
  );
}

/**
 * Points at whatever `data-hand` names ("center" is the middle of the
 * screen). On the lower half of the screen it points down from above, so it
 * never runs off the bottom. `tapping` presses it in.
 */
function GhostHand({
  target,
  tapping,
  carrying,
}: {
  target: string | null;
  tapping: boolean;
  carrying: ReactNode;
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
  const slot = frameArt["ghost-hand"];
  const { anchor } = slot;
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
      {carrying && (
        <span
          className={styles.carrying}
          style={{ left: anchor.x, top: anchor.y }}
        >
          {carrying}
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
          <SlotImage id="ghost-hand" slot={slot} size={64} />
        </div>
      </div>
    </div>
  );
}
