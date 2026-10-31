// The student's stickers on their locker. They tap a sticker (or drag it),
// then tap (or drop) where it goes on the locker; a sticker already on it
// moves the same way, or goes back with the "put it back" button, or by
// dragging it off. Every change is saved at once, and only to their own
// locker. Each step is spoken, so it works without reading.
import { type RecognitionTrait, traitOf } from "@repo/rewards";
import { StickerPicture } from "@repo/rewards/sticker";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { ThemeIcon } from "@repo/ui/theme-icon";
import { Title } from "@repo/ui/title";
import {
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Placement, Platform } from "../platform/ports.ts";
import type { Voice } from "../play/voice.ts";
import styles from "./home.module.css";
import { shellT } from "./shared.tsx";
import type { ShellStringId } from "./shell-strings.ts";

/** What each recognition sticker is called and says: a teacher gave it. */
export const recognitionLines: Record<RecognitionTrait, ShellStringId> = {
  kindness: "recognition-kindness",
  perseverance: "recognition-perseverance",
  leadership: "recognition-leadership",
};

/** What a sticker is called, for a screen reader. */
export function stickerLabel(sticker: string): string {
  const trait = traitOf(sticker);
  return shellT(trait ? recognitionLines[trait] : "sticker");
}

/** Width and height of a sticker on the locker, in px. */
const size = 64;
/** How far a press moves before it's a drag, not a tap, in px. */
const dragFrom = 8;

/** The sticker in the student's hand, and where they took it from. */
interface Held {
  sticker: string;
  from: "tray" | "locker";
}

/** A sticker being dragged: where the pointer is. */
interface Drag extends Held {
  x: number;
  y: number;
}

export function Stickers({
  stickers,
  placements: saved,
  platform,
  voice,
  hear,
}: {
  /** Every sticker the student owns. */
  stickers: readonly string[];
  placements: readonly Placement[];
  platform: Platform;
  voice: Voice;
  /** The "hear it" button for the section's heading. */
  hear(name: string, line: string): ReactNode;
}) {
  const [placements, setPlacements] = useState(saved);
  const [held, setHeld] = useState<Held | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLButtonElement>(null);
  const press = useRef<{
    held: Held;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const dragged = useRef(false);
  // Saves run one after another, so the last change is the one kept.
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const saves = useRef(0);

  const owned = new Set(stickers);
  // This panel is the front of the locker's door; ticket 33 adds the inside.
  const shown = placements.filter(
    (p) => owned.has(p.sticker) && p.surface === "front",
  );
  const onLocker = new Set(placements.map((p) => p.sticker));
  const inTray = stickers.filter((s) => !onLocker.has(s));

  const save = (next: Placement[], send: () => Promise<unknown>) => {
    setPlacements(next);
    const id = ++saves.current;
    saving.current = saving.current.then(() =>
      send()
        .then(
          () => platform.home.current(),
          (error: unknown) => {
            console.error("[play] Couldn't save the stickers", error);
            return platform.home.current();
          },
        )
        .then(
          // What's saved, with its tilts, once no later change is on its way.
          (home) => {
            if (id === saves.current) setPlacements(home.placements);
          },
          (error: unknown) =>
            console.error("[play] Couldn't load the stickers", error),
        ),
    );
  };

  const pickUp = (next: Held) => {
    setHeld(next);
    void voice.say(next.from === "tray" ? "place-sticker" : "move-sticker");
  };

  /** Where on the locker a point is, as fractions, keeping the sticker on it. */
  const spotAt = (clientX: number, clientY: number) => {
    const rect = board.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0)
      return { x: 0.5, y: 0.5 };
    const keep = (at: number, start: number, length: number) => {
      const margin = Math.min(0.5, size / 2 / length);
      return clamp((at - start) / length, margin, 1 - margin);
    };
    return {
      x: keep(clientX, rect.left, rect.width),
      y: keep(clientY, rect.top, rect.height),
    };
  };

  /** Whether a point is on the locker. */
  const isOnBoard = (clientX: number, clientY: number) => {
    const rect = board.current?.getBoundingClientRect();
    return (
      !!rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  const put = (sticker: string, spot: { x: number; y: number }) => {
    voice.stop();
    setHeld(null);
    const was = placements.find((p) => p.sticker === sticker);
    const placed = { sticker, surface: "front" as const, ...spot };
    // On top of the others: last in the list.
    save(
      [
        ...placements.filter((p) => p.sticker !== sticker),
        { ...placed, tilt: was?.tilt ?? 0 },
      ],
      () => platform.home.place(sticker, placed),
    );
  };

  const putBack = (sticker: string) => {
    voice.stop();
    setHeld(null);
    if (onLocker.has(sticker))
      save(
        placements.filter((p) => p.sticker !== sticker),
        () => platform.home.takeOff(sticker),
      );
  };

  // Pressing a sticker: a tap picks it up, a drag carries it.
  const pressHandlers = (it: Held) => ({
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      press.current = {
        held: it,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove(event: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      if (!p) return;
      const moved = Math.hypot(
        event.clientX - p.startX,
        event.clientY - p.startY,
      );
      if (!p.dragging && moved < dragFrom) return;
      p.dragging = true;
      setHeld(null);
      setDrag({ ...p.held, x: event.clientX, y: event.clientY });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      press.current = null;
      if (!p?.dragging) return;
      dragged.current = true;
      setDrag(null);
      if (isOnBoard(event.clientX, event.clientY))
        put(p.held.sticker, spotAt(event.clientX, event.clientY));
      else putBack(p.held.sticker);
    },
    onPointerCancel() {
      press.current = null;
      setDrag(null);
    },
    onClick() {
      // A drag ends in a click too; only a tap picks up.
      if (dragged.current) {
        dragged.current = false;
        return;
      }
      // Tapping the sticker in hand again puts it down where it was.
      if (held?.sticker === it.sticker) {
        voice.stop();
        return setHeld(null);
      }
      pickUp(it);
    },
  });

  // Picking one up moves focus to the locker, so from the keyboard the next
  // Enter sticks it on.
  useEffect(() => {
    if (held) target.current?.focus({ preventScroll: true });
  }, [held]);

  // Escape puts down what's held, where it was.
  useEffect(() => {
    if (!held) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      voice.stop();
      setHeld(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [held, voice]);

  return (
    <section
      className={`${styles.section} ${styles.card}`}
      aria-labelledby="stickers"
      data-tone="recognition"
    >
      <div className={styles.classHeading}>
        <ThemeIcon tone="recognition" size="md">
          <Icon name="star" size={24} />
        </ThemeIcon>
        <Title order={2} size="h3" id="stickers">
          {shellT("stickers")}
        </Title>
        {hear(shellT("stickers"), "stickers-how")}
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: a picture of the locker the stickers are on, not a form's fieldset */}
      <div
        ref={board}
        className={styles.board}
        data-holding={held ? true : undefined}
        role="group"
        aria-label={shellT("locker")}
      >
        {shown.map(({ sticker, x, y }) => {
          const isHeld = held?.sticker === sticker || drag?.sticker === sticker;
          return (
            <button
              key={sticker}
              type="button"
              className={styles.placed}
              style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
              data-held={isHeld ? true : undefined}
              aria-pressed={held?.sticker === sticker}
              aria-label={stickerLabel(sticker)}
              {...pressHandlers({ sticker, from: "locker" })}
            >
              <StickerPicture sticker={sticker} size={size} />
            </button>
          );
        })}
        {held && (
          // Over the whole locker while a sticker is held: tap where it goes.
          // From the keyboard, it goes in the middle.
          <button
            ref={target}
            type="button"
            className={styles.target}
            aria-label={shellT("put-sticker-here")}
            onClick={(event) =>
              put(
                held.sticker,
                event.detail === 0
                  ? { x: 0.5, y: 0.5 }
                  : spotAt(event.clientX, event.clientY),
              )
            }
          />
        )}
      </div>
      <div className={styles.tray}>
        {inTray.length > 0 && (
          <ul className={styles.stickers} aria-label={shellT("stickers")}>
            {inTray.map((sticker) => (
              <li key={sticker}>
                <button
                  type="button"
                  className={styles.loose}
                  data-held={
                    held?.sticker === sticker || drag?.sticker === sticker
                      ? true
                      : undefined
                  }
                  aria-pressed={held?.sticker === sticker}
                  aria-label={stickerLabel(sticker)}
                  {...pressHandlers({ sticker, from: "tray" })}
                >
                  <StickerPicture sticker={sticker} size={size} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {held && (
          <IconButton
            tone="neutral"
            label={shellT("sticker-back")}
            className={styles.back}
            onClick={() => putBack(held.sticker)}
          >
            <Icon name="x" size={32} />
          </IconButton>
        )}
      </div>
      {drag && (
        <div
          className={styles.dragging}
          style={{ left: drag.x, top: drag.y }}
          aria-hidden
        >
          <StickerPicture sticker={drag.sticker} size={size} />
        </div>
      )}
    </section>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
