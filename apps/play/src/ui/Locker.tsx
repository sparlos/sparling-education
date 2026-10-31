// The student's locker, its own screen, opened from the small locker on
// home. It opens on the closed door; the handle swings the door open, to the
// inside of the door and the inside of the locker, with a keepsake for each
// game they've played. Stickers from the tray below go on whichever face of
// the door is showing: tap one (or drag it), then tap (or drop) where it
// goes. A sticker on the door moves the same way, or comes off by going back
// to the tray. Every change is saved at once, and only to their own locker.
// Each step is spoken, so it works without reading.
import { StickerPicture } from "@repo/rewards/sticker";
import { classColour } from "@repo/tokens";
import { Icon } from "@repo/ui/icon";
import { IconButton } from "@repo/ui/icon-button";
import { Title } from "@repo/ui/title";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type Home,
  lockerGlows,
  type Placement,
  type Platform,
  type Student,
  type Surface,
} from "../platform/ports.ts";
import { lockerPath } from "../play/routes.ts";
import type { VoiceOptions } from "../play/voice.ts";
import { KeepsakePicture } from "./home-art.tsx";
import styles from "./locker.module.css";
import { LockerArt } from "./locker-art.tsx";
import { type DoorFrame, isOnDoor, pointOnDoor } from "./locker-geometry.ts";
import { gameLine, shellT, useShellVoice } from "./shared.tsx";
import { stickerLabel } from "./sticker-lines.ts";

/** How long the door takes to swing, and a new keepsake's moment, in ms. */
export interface LockerTiming {
  swingMs: number;
  momentMs: number;
}

export const lockerTiming: LockerTiming = { swingMs: 700, momentMs: 1100 };

/** How far the open door turns, in degrees: it stops at an angle beside the locker. */
const openAngle = 132;
/**
 * The room left of the locker for the open door, as a share of its width:
 * enough for its near edge, which is drawn larger, to stay on screen.
 */
const doorRoom = 0.85;
/** The locker's box's CSS perspective, in px; locker.module.css draws with it. */
const perspective = 1800;
/** The door's width over its height. */
const doorRatio = 0.6;
/** A sticker's width, as a share of the door's. */
const stickerShare = 0.2;
/** How far a press moves before it's a drag, not a tap, in px. */
const dragFrom = 8;

/** The sticker in the student's hand, and where they took it from. */
interface Held {
  sticker: string;
  from: "tray" | Surface;
}

/** A sticker being dragged: where the pointer is, and how big it's drawn. */
interface Drag extends Held {
  x: number;
  y: number;
  size: number;
}

/** What the student calls a game, and the colour of the class they play it in. */
function gamesOf(student: Student) {
  const found = new Map<string, { name: string; colour: string }>();
  for (const m of student.classes)
    for (const g of m.games)
      if (!found.has(g.slug))
        found.set(g.slug, { name: g.name, colour: m.classColour });
  return found;
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function useReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setReduced(list.matches);
    list.addEventListener("change", change);
    return () => list.removeEventListener("change", change);
  }, []);
  return reduced;
}

export function Locker({
  student,
  home,
  platform,
  speak,
  timing = lockerTiming,
  onHome,
}: {
  student: Student;
  home: Home;
  platform: Platform;
  speak?: VoiceOptions["speak"];
  timing?: LockerTiming;
  onHome(): void;
}) {
  const voice = useShellVoice(student.locale, speak);
  const reduced = useReducedMotion();
  const swingMs = reduced ? 0 : timing.swingMs;
  const [placements, setPlacements] = useState(home.placements);
  const [open, setOpen] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const tray = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLButtonElement>(null);
  const handles = useRef<Partial<Record<Surface, HTMLButtonElement | null>>>(
    {},
  );
  const toggled = useRef(false);
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
  // Keepsakes still to have their moment, and the door opening that's having them.
  const fresh = useRef(new Set(home.newKeepsakes));
  const opening = useRef(0);

  const showing: Surface = open ? "inside" : "front";
  const games = gamesOf(student);
  const owned = new Set(home.stickers);
  const placed = placements.filter((p) => owned.has(p.sticker));
  const onDoor = new Set(placed.map((p) => p.sticker));
  const inTray = home.stickers.filter((s) => !onDoor.has(s));

  useEffect(() => {
    void voice.say("locker-how");
  }, [voice]);

  // Leaving stops a keepsake's moment.
  useEffect(
    () => () => {
      opening.current += 1;
    },
    [],
  );

  // The handle that's showing keeps the focus after a swing.
  useEffect(() => {
    if (toggled.current)
      handles.current[showing]?.focus({ preventScroll: true });
  }, [showing]);

  // Picking one up moves focus to the door, so from the keyboard the next
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
          (saved) => {
            if (id === saves.current) setPlacements(saved.placements);
          },
          (error: unknown) =>
            console.error("[play] Couldn't load the stickers", error),
        ),
    );
  };

  /** The locker's box and how its door is turned now. */
  const frame = (): DoorFrame | null => {
    const rect = area.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      doorRoom,
      angle: open ? openAngle : 0,
      perspective,
    };
  };

  /** Where on the showing face a point is, keeping a sticker wholly on it; null when it's off. */
  const spotAt = (clientX: number, clientY: number) => {
    const f = frame();
    if (!f) return null;
    const point = pointOnDoor(f, clientX, clientY);
    if (!isOnDoor(point)) return null;
    const mx = stickerShare / 2;
    const my = mx * doorRatio;
    return {
      x: clamp(point.x, mx, 1 - mx),
      y: clamp(point.y, my, 1 - my),
    };
  };

  const isOnTray = (clientX: number, clientY: number) => {
    const rect = tray.current?.getBoundingClientRect();
    return (
      !!rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  /** A sticker's size on the door, in px, for the one under a finger. */
  const stickerPx = () => {
    const f = frame();
    return f ? Math.round((f.width / (1 + doorRoom)) * stickerShare) : 64;
  };

  const pickUp = (next: Held) => {
    setHeld(next);
    void voice.say(next.from === "tray" ? "place-sticker" : "move-sticker");
  };

  const put = (sticker: string, spot: { x: number; y: number }) => {
    voice.stop();
    setHeld(null);
    const was = placements.find((p) => p.sticker === sticker);
    const at = { sticker, surface: showing, ...spot };
    // On top of the others: last in the list. The tilt is the saved one's.
    save(
      [
        ...placements.filter((p) => p.sticker !== sticker),
        { ...at, tilt: was?.tilt ?? 0 },
      ],
      () => platform.home.place(sticker, at),
    );
  };

  const putBack = (sticker: string) => {
    voice.stop();
    setHeld(null);
    if (onDoor.has(sticker))
      save(
        placements.filter((p) => p.sticker !== sticker),
        () => platform.home.takeOff(sticker),
      );
  };

  // Pressing a sticker: a tap picks it up, a drag carries it.
  const pressHandlers = (it: Held) => ({
    onPointerDown(event: ReactPointerEvent<HTMLElement>) {
      if (event.button !== 0) return;
      // A drag that ended without a click mustn't swallow this press's.
      dragged.current = false;
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
      setDrag({
        ...p.held,
        x: event.clientX,
        y: event.clientY,
        size: drag?.size ?? stickerPx(),
      });
    },
    onPointerUp(event: ReactPointerEvent<HTMLElement>) {
      const p = press.current;
      press.current = null;
      if (!p?.dragging) return;
      dragged.current = true;
      setDrag(null);
      if (isOnTray(event.clientX, event.clientY))
        return putBack(p.held.sticker);
      const spot = spotAt(event.clientX, event.clientY);
      // Dropped anywhere else, it stays where it was.
      if (spot) put(p.held.sticker, spot);
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

  const toggle = () => {
    const next = !open;
    toggled.current = true;
    setHeld(null);
    setCelebrating(null);
    setOpen(next);
    const mine = ++opening.current;
    const said = voice.say(next ? "open-locker" : "close-locker");
    const newOnes = home.keepsakes.filter((g) => fresh.current.has(g));
    if (!next || newOnes.length === 0) return;
    // Each new keepsake's moment, then the voice says what it is: they take turns.
    void (async () => {
      await Promise.all([said, wait(swingMs)]);
      for (const game of newOnes) {
        if (opening.current !== mine) return;
        setCelebrating(game);
        await wait(timing.momentMs);
        if (opening.current !== mine) return;
        setCelebrating(null);
        fresh.current.delete(game);
        platform.home.markKeepsakesSeen([game]).catch((error: unknown) => {
          // It stays new, and has its moment again next time.
          console.error("[play] Couldn't mark a keepsake as seen", error);
        });
        const name = games.get(game)?.name;
        await (name
          ? voice.say("new-keepsake", gameLine(game, name))
          : voice.say("new-keepsake-from-a-game"));
      }
    })();
  };

  const face = (surface: Surface) => {
    const isShowing = surface === showing;
    return (
      // biome-ignore lint/a11y/useSemanticElements: a face of the door the stickers are on, not a form's fieldset
      <div
        className={styles.face}
        data-surface={surface}
        role="group"
        aria-label={shellT(
          surface === "front" ? "locker-door" : "locker-door-inside",
        )}
        aria-hidden={isShowing ? undefined : true}
        inert={!isShowing}
        data-holding={isShowing && held ? true : undefined}
      >
        <LockerArt
          slot={surface === "front" ? "locker-front" : "locker-inside"}
        />
        {placed
          .filter((p) => p.surface === surface)
          .map(({ sticker, x, y, tilt }, z) => (
            <button
              key={sticker}
              type="button"
              className={styles.placed}
              style={
                {
                  left: `${x * 100}%`,
                  top: `${y * 100}%`,
                  zIndex: z + 1,
                  "--tilt": `${tilt}deg`,
                } as CSSProperties
              }
              data-held={
                held?.sticker === sticker || drag?.sticker === sticker
                  ? true
                  : undefined
              }
              aria-pressed={held?.sticker === sticker}
              aria-label={stickerLabel(sticker)}
              {...pressHandlers({ sticker, from: surface })}
            >
              <StickerPicture sticker={sticker} size={64} />
            </button>
          ))}
        {isShowing && held && (
          // Over the whole face while a sticker is held: tap where it goes.
          // From the keyboard, it goes in the middle.
          <button
            ref={target}
            type="button"
            className={styles.target}
            aria-label={shellT("put-sticker-here")}
            onClick={(event) => {
              const spot =
                event.detail === 0
                  ? { x: 0.5, y: 0.5 }
                  : spotAt(event.clientX, event.clientY);
              if (spot) put(held.sticker, spot);
            }}
          />
        )}
        <button
          ref={(el) => {
            handles.current[surface] = el;
          }}
          type="button"
          className={styles.handle}
          aria-label={shellT(
            surface === "front" ? "open-locker" : "close-locker",
          )}
          title={shellT(surface === "front" ? "open-locker" : "close-locker")}
          onClick={toggle}
        />
      </div>
    );
  };

  // Two keepsakes to a shelf, in fixed places in the order first played.
  const shelves: { id: string; kept: string[] }[] = [];
  const shelfCount = Math.max(3, Math.ceil(home.keepsakes.length / 2));
  for (let n = 0; n < shelfCount; n++)
    shelves.push({
      id: `shelf-${n}`,
      kept: home.keepsakes.slice(n * 2, n * 2 + 2),
    });

  return (
    <main
      className={styles.locker}
      data-tone="brand"
      style={
        {
          "--swing": `${swingMs}ms`,
          "--moment": `${timing.momentMs}ms`,
          "--door-room": doorRoom,
          "--door-ratio": doorRatio,
          "--open-angle": `${openAngle}deg`,
          "--perspective": `${perspective}px`,
          "--sticker-share": stickerShare,
        } as CSSProperties
      }
    >
      <div className={styles.header}>
        <IconButton tone="neutral" label={shellT("to-home")} onClick={onHome}>
          <Icon name="leave" size={32} />
        </IconButton>
        <Title order={1} size="h3" className={styles.title}>
          {shellT("locker")}
        </Title>
        <IconButton
          tone="neutral"
          label={shellT("hear-again")}
          onClick={() => void voice.say("locker-how")}
        >
          <Icon name="speaker" size={32} />
        </IconButton>
      </div>
      <div className={styles.room}>
        <div
          ref={area}
          className={styles.area}
          data-locker-area
          data-open={open ? true : undefined}
        >
          {/* biome-ignore lint/a11y/useSemanticElements: the locker's shelves, not a form's fieldset */}
          <div
            className={styles.inside}
            role="group"
            aria-label={shellT("locker-shelves")}
            aria-hidden={open ? undefined : true}
            inert={!open}
          >
            <LockerArt slot="locker-inside" />
            {shelves.map(({ id, kept }) => (
              <div key={id} className={styles.shelf}>
                {kept.map((game) => {
                  const known = games.get(game);
                  return (
                    <button
                      key={game}
                      type="button"
                      className={styles.keepsake}
                      data-keepsake={game}
                      data-new={fresh.current.has(game) ? true : undefined}
                      data-celebrating={celebrating === game ? true : undefined}
                      aria-label={
                        known
                          ? `${shellT("keepsake-from")} ${known.name}`
                          : shellT("keepsake-from-a-game")
                      }
                      onClick={() =>
                        void (known
                          ? voice.say(
                              "keepsake-from",
                              gameLine(game, known.name),
                            )
                          : voice.say("keepsake-from-a-game"))
                      }
                    >
                      <KeepsakePicture
                        slug={game}
                        tint={classColour(known?.colour ?? "").tone.fill}
                      />
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className={styles.door}>
            {face("front")}
            {face("inside")}
          </div>
        </div>
      </div>
      <div
        ref={tray}
        className={styles.tray}
        data-holding={held ? true : undefined}
      >
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
                  <StickerPicture sticker={sticker} size={56} />
                </button>
              </li>
            ))}
          </ul>
        )}
        {held && held.from !== "tray" && (
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
          <StickerPicture sticker={drag.sticker} size={drag.size} />
        </div>
      )}
    </main>
  );
}

/**
 * The small locker on home: the front of the door, with its stickers. It
 * glows while there's a new keepsake in it or a sticker not on it yet, and
 * opens the locker.
 */
export function SmallLocker({
  base,
  home,
}: {
  base: string;
  /** What the student has, or null while it's loading or couldn't be read. */
  home: Home | null;
}) {
  const owned = new Set(home?.stickers);
  return (
    <a
      href={lockerPath(base)}
      className={styles.small}
      data-tone="brand"
      data-glow={home && lockerGlows(home) ? true : undefined}
      aria-label={shellT("locker")}
      title={shellT("locker")}
    >
      <LockerArt slot="locker-small" />
      {home?.placements
        .filter((p) => p.surface === "front" && owned.has(p.sticker))
        .map(({ sticker, x, y, tilt }) => (
          <span
            key={sticker}
            className={styles.placed}
            style={
              {
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                "--tilt": `${tilt}deg`,
              } as CSSProperties
            }
          >
            <StickerPicture sticker={sticker} size={16} />
          </span>
        ))}
    </a>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** How the door is drawn, so tests can find a spot on it. */
export const lockerDoor = { openAngle, doorRoom, perspective } as const;
