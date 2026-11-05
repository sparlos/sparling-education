// Dev only, at /play/avatar-fit: the founder fits each avatar picture to the
// body by hand. Pick an item, drag and resize it on the avatar, block out the
// parts that shouldn't show, and save. Saving writes packages/avatar/src/fits.ts,
// src/fit-masks.ts and art/masks/, ready to commit (see avatar-fit-server.ts).
import { type AvatarLook, defaultLook } from "@repo/avatar";
import { itemUrl, maskedPieces, maskUrl } from "@repo/avatar/art";
import { frame } from "@repo/avatar/layout";
import {
  type Box,
  cutBoxes,
  type Item,
  items,
  itemsIn,
  type PartSlot,
} from "@repo/avatar/parts";
import { ItemPicture, Portrait } from "@repo/avatar/portrait";
import { Button } from "@repo/ui/button";
import { PictureButton } from "@repo/ui/picture-button";
import { Text } from "@repo/ui/text";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import styles from "./avatar-fit.module.css";

const slots = [
  "hair",
  "hat",
  "top",
  "bottom",
  "shoes",
  "body",
] as const satisfies PartSlot[];
type Slot = (typeof slots)[number];

const slotNames: Record<Slot, string> = {
  hair: "Hair",
  hat: "Hats",
  top: "Tops",
  bottom: "Bottoms",
  shoes: "Shoes",
  body: "Skin",
};

const stageSize = 680;
const scale = stageSize / frame.size;
const toStage = (b: Box) => ({
  x: (b.x - frame.x) * scale,
  y: (b.y - frame.y) * scale,
  width: b.width * scale,
  height: b.height * scale,
});

const placeKey = "avatar-fit.place";

/** What undo and redo step between. */
interface Snapshot {
  boxes: Record<string, Box>;
  masks: Record<string, string | null>;
}

interface Place {
  slot: Slot;
  item: Record<Slot, string>;
}

function firstPlace(): Place {
  const fallback: Place = {
    slot: "hair",
    item: {
      hair: defaultLook.hair,
      hat: itemsIn("hat")[0] ?? "",
      top: defaultLook.top,
      bottom: defaultLook.bottom,
      shoes: defaultLook.shoes,
      body: defaultLook.body,
    },
  };
  try {
    const saved = localStorage.getItem(placeKey);
    return saved ? (JSON.parse(saved) as Place) : fallback;
  } catch {
    return fallback;
  }
}

/** Every picture's box as it stands: hand fits over how the art was cut. */
function savedBoxes(): Record<string, Box> {
  const boxes: Record<string, Box> = { ...cutBoxes };
  for (const item of items.values())
    for (const { id, x, y, width, height } of item.pieces)
      boxes[id] = { x, y, width, height };
  return boxes;
}

const sameBox = (a?: Box, b?: Box) =>
  !!a &&
  !!b &&
  a.x === b.x &&
  a.y === b.y &&
  a.width === b.width &&
  a.height === b.height;

/** The other shoe's ID, if this is a shoe. */
function otherShoe(id: string): string | null {
  if (id.endsWith("-left")) return id.replace(/-left$/, "-right");
  if (id.endsWith("-right")) return id.replace(/-right$/, "-left");
  return null;
}

export default function AvatarFit() {
  const [place, setPlace] = useState(firstPlace);
  const [boxes, setBoxes] = useState(savedBoxes);
  const [masks, setMasks] = useState<Record<string, string | null>>({});
  const [piece, setPiece] = useState(0);
  const [hatOn, setHatOn] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [brush, setBrush] = useState(24);
  const [locked, setLocked] = useState(false);
  const [boxHidden, setBoxHidden] = useState(false);
  const [mirror, setMirror] = useState(true);
  const [status, setStatus] = useState("");
  const [version, setVersion] = useState(0);
  const saved = useRef(boxes);
  const savedMasks = useRef<Record<string, string | null>>({});
  const history = useRef<{ undo: Snapshot[]; redo: Snapshot[] }>({
    undo: [],
    redo: [],
  });
  const latest = useRef<Snapshot>({ boxes, masks });
  latest.current = { boxes, masks };

  const { slot } = place;
  const itemId = place.item[slot];
  const item = items.get(itemId) as Item;
  const pieces = item.pieces;
  const pieceId = pieces[Math.min(piece, pieces.length - 1)]?.id ?? itemId;
  const editable = slot !== "body";

  const look = useMemo(
    (): AvatarLook =>
      ({
        body: place.item.body,
        hair: place.item.hair,
        hat: slot === "hat" || hatOn ? place.item.hat : null,
        top: place.item.top,
        bottom: place.item.bottom,
        shoes: place.item.shoes,
      }) as AvatarLook,
    [place, slot, hatOn],
  );

  useEffect(() => {
    try {
      localStorage.setItem(placeKey, JSON.stringify(place));
    } catch {
      // Only a convenience: the tool starts from the first item without it.
    }
  }, [place]);

  // Saved masks as images, so undo can always put one back as it was.
  useEffect(() => {
    void Promise.all(
      maskedPieces().map(async (id): Promise<[string, string]> => {
        const blob = await (await fetch(maskUrl(id) as string)).blob();
        return [
          id,
          await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          }),
        ];
      }),
    ).then((loaded) => {
      const found = Object.fromEntries(loaded);
      savedMasks.current = found;
      setMasks(found);
    });
  }, []);

  const moved = Object.keys(boxes).filter(
    (id) => !sameBox(boxes[id], saved.current[id]),
  );
  const masked = [
    ...new Set([...Object.keys(masks), ...Object.keys(savedMasks.current)]),
  ].filter((id) => (masks[id] ?? null) !== (savedMasks.current[id] ?? null));
  const dirty = moved.length + masked.length;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Marks where undo comes back to: call it before a change. */
  const checkpoint = useCallback(() => {
    history.current.undo.push(latest.current);
    history.current.redo = [];
  }, []);

  /** Steps through history, past any step that changed nothing. */
  const step = useCallback((from: "undo" | "redo") => {
    const to = from === "undo" ? "redo" : "undo";
    const stack = history.current[from];
    let next = stack.pop();
    while (
      next &&
      next.boxes === latest.current.boxes &&
      next.masks === latest.current.masks
    )
      next = stack.pop();
    if (!next) return;
    history.current[to].push(latest.current);
    setBoxes(next.boxes);
    setMasks(next.masks);
    setVersion((v) => v + 1);
  }, []);

  /** Sets a piece's box, and, with mirroring, its shoe's opposite. */
  const setBox = useCallback(
    (id: string, box: Box) => {
      setBoxes((was) => {
        const next = { ...was, [id]: box };
        const other = otherShoe(id);
        if (other && mirror) next[other] = { ...box, x: -(box.x + box.width) };
        return next;
      });
    },
    [mirror],
  );

  const moveItem = useCallback((by: number) => {
    setPlace((was) => {
      const list = itemsIn(was.slot) as string[];
      const at = list.indexOf(was.item[was.slot]);
      const next = list[(at + by + list.length) % list.length] ?? list[0] ?? "";
      return { ...was, item: { ...was.item, [was.slot]: next } };
    });
    setPiece(0);
  }, []);

  const moveSlot = useCallback((by: number) => {
    setPlace((was) => {
      const at = slots.indexOf(was.slot);
      const next = slots[(at + by + slots.length) % slots.length] ?? "hair";
      return { ...was, slot: next };
    });
    setPiece(0);
  }, []);

  const save = useCallback(async () => {
    const fits: Record<string, Box> = {};
    for (const [id, box] of Object.entries(boxes))
      if (!sameBox(box, cutBoxes[id])) fits[id] = box;
    setStatus("Saving…");
    const response = await fetch("/__avatar-fit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // A mask undone since it was saved has no entry, and has to go.
      body: JSON.stringify({
        fits,
        masks: Object.fromEntries(masked.map((id) => [id, masks[id] ?? null])),
      }),
    });
    if (response.ok) {
      saved.current = boxes;
      savedMasks.current = masks;
      setStatus("Saved. Commit packages/avatar when you're ready.");
    } else setStatus(`Couldn't save: ${await response.text()}`);
  }, [boxes, masks, masked]);

  const reset = useCallback(() => {
    checkpoint();
    const box = cutBoxes[pieceId];
    if (box) setBox(pieceId, box);
    setMasks((was) => ({ ...was, [pieceId]: null }));
    setVersion((v) => v + 1);
  }, [checkpoint, pieceId, setBox]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const arrow = arrows[e.key];
      if (arrow) {
        e.preventDefault();
        if (e.shiftKey) {
          const step = e.altKey ? 10 : 1;
          const box = boxes[pieceId];
          if (box && editable) {
            checkpoint();
            setBox(pieceId, {
              ...box,
              x: box.x + arrow[0] * step,
              y: box.y + arrow[1] * step,
            });
          }
        } else if (arrow[0]) moveItem(arrow[0]);
        else moveSlot(arrow[1]);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        step(e.shiftKey ? "redo" : "undo");
        return;
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        step("redo");
        return;
      }
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Tab" && pieces.length > 1) {
        e.preventDefault();
        setPiece((p) => (p + 1) % pieces.length);
      } else if (e.key === "e" && editable) setErasing((v) => !v);
      else if (e.key === "x") setRestoring((v) => !v);
      else if (e.key === "[") setBrush((b) => Math.max(4, b - 4));
      else if (e.key === "]") setBrush((b) => Math.min(120, b + 4));
      else if (e.key === "l") setLocked((v) => !v);
      else if (e.key === "b") setBoxHidden((v) => !v);
      else if (e.key === "m") setMirror((v) => !v);
      else if (e.key === "h") setHatOn((v) => !v);
      else if (e.key === "r" && editable) reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    boxes,
    checkpoint,
    editable,
    moveItem,
    moveSlot,
    pieceId,
    pieces.length,
    reset,
    save,
    setBox,
    step,
  ]);

  const list = itemsIn(slot) as string[];
  const box = boxes[pieceId];

  return (
    <main className={styles.page}>
      <div
        className={boxHidden ? `${styles.stage} ${styles.noBox}` : styles.stage}
        style={{ width: stageSize, height: stageSize }}
      >
        <Portrait
          look={look}
          expression="happy"
          size={stageSize}
          label="The avatar being fitted"
          draft={{ boxes, masks }}
        />
        {editable &&
          pieces.map((p, i) => {
            const b = boxes[p.id];
            if (!b || (erasing && p.id !== pieceId)) return null;
            const at = toStage(b);
            return erasing ? (
              <Eraser
                key={`${p.id}-${version}`}
                piece={p.id}
                mask={masks[p.id]}
                at={at}
                brush={brush}
                restoring={restoring}
                onStrokeStart={checkpoint}
                onChange={(mask) =>
                  setMasks((was) => ({ ...was, [p.id]: mask }))
                }
              />
            ) : (
              <Rnd
                key={p.id}
                className={p.id === pieceId ? styles.active : styles.idle}
                size={{ width: at.width, height: at.height }}
                position={{ x: at.x, y: at.y }}
                lockAspectRatio={locked}
                onMouseDown={() => setPiece(i)}
                onDragStart={checkpoint}
                onResizeStart={checkpoint}
                onDrag={(_e, d) =>
                  setBox(p.id, {
                    ...b,
                    x: d.x / scale + frame.x,
                    y: d.y / scale + frame.y,
                  })
                }
                onResize={(_e, _dir, element, _delta, position) =>
                  setBox(p.id, {
                    x: position.x / scale + frame.x,
                    y: position.y / scale + frame.y,
                    width: element.offsetWidth / scale,
                    height: element.offsetHeight / scale,
                  })
                }
              />
            );
          })}
      </div>

      <div className={styles.side}>
        <div className={styles.slots}>
          {slots.map((s) => (
            <Button
              key={s}
              variant={s === slot ? "primary" : "secondary"}
              onClick={() => {
                setPlace((was) => ({ ...was, slot: s }));
                setPiece(0);
              }}
            >
              {slotNames[s]}
            </Button>
          ))}
        </div>

        <ul className={styles.items} aria-label={slotNames[slot]}>
          {list.map((id) => (
            <li key={id}>
              <Tile
                id={id}
                selected={id === itemId}
                onPick={() => {
                  setPlace((was) => ({
                    ...was,
                    item: { ...was.item, [was.slot]: id },
                  }));
                  setPiece(0);
                }}
              />
            </li>
          ))}
        </ul>

        <Text>
          <strong>{pieceId}</strong>
          {box &&
            ` · x ${box.x.toFixed(1)}, y ${box.y.toFixed(1)}, ${box.width.toFixed(1)} × ${box.height.toFixed(1)}`}
        </Text>

        <div className={styles.controls}>
          <Button
            variant={erasing ? "primary" : "secondary"}
            disabled={!editable}
            onClick={() => setErasing((v) => !v)}
          >
            {erasing ? "Stop blocking out" : "Block out"}
          </Button>
          <Button
            variant={restoring ? "primary" : "secondary"}
            disabled={!erasing}
            onClick={() => setRestoring((v) => !v)}
          >
            Bring back
          </Button>
          <label className={styles.brush}>
            Block-out size
            <input
              type="range"
              min={4}
              max={120}
              value={brush}
              onChange={(e) => setBrush(Number(e.target.value))}
            />
          </label>
          <Button
            variant={locked ? "primary" : "secondary"}
            onClick={() => setLocked((v) => !v)}
          >
            Keep shape
          </Button>
          {slot === "shoes" && (
            <Button
              variant={mirror ? "primary" : "secondary"}
              onClick={() => setMirror((v) => !v)}
            >
              Move both shoes
            </Button>
          )}
          <Button
            variant={hatOn ? "primary" : "secondary"}
            onClick={() => setHatOn((v) => !v)}
          >
            Wear hat
          </Button>
          <Button variant="secondary" disabled={!editable} onClick={reset}>
            Reset this
          </Button>
          <Button variant="secondary" onClick={() => step("undo")}>
            Undo
          </Button>
          <Button variant="secondary" onClick={() => step("redo")}>
            Redo
          </Button>
          <Button disabled={dirty === 0} onClick={() => void save()}>
            Save{dirty > 0 ? ` (${dirty})` : ""}
          </Button>
        </div>

        <Text>{status}</Text>

        <dl className={styles.keys}>
          <dt>← →</dt>
          <dd>Next item</dd>
          <dt>↑ ↓</dt>
          <dd>Next slot</dd>
          <dt>Shift + arrows</dt>
          <dd>Move it (add Alt for bigger steps)</dd>
          <dt>B</dt>
          <dd>Hide the box, or show it</dd>
          <dt>Tab</dt>
          <dd>Other shoe</dd>
          <dt>E</dt>
          <dd>Block out, on or off</dd>
          <dt>X</dt>
          <dd>Block out or bring back</dd>
          <dt>[ ]</dt>
          <dd>Block-out size</dd>
          <dt>L · M · H</dt>
          <dd>Keep shape · Move both shoes · Wear hat</dd>
          <dt>R</dt>
          <dd>Reset this</dd>
          <dt>⌘Z · ⇧⌘Z</dt>
          <dd>Undo · Redo</dd>
          <dt>⌘S</dt>
          <dd>Save</dd>
        </dl>
      </div>
    </main>
  );
}

function Tile({
  id,
  selected,
  onPick,
}: {
  id: string;
  selected: boolean;
  onPick(): void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  return (
    <span ref={ref}>
      <PictureButton label={id} selected={selected} size={4.5} onClick={onPick}>
        <ItemPicture item={id} size={56} />
      </PictureButton>
    </span>
  );
}

/** Shown see-through by the page's CSS, so the art shows under it. */
const paintColour = "rgb(230, 30, 90)";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/** The paint for a piece, solid where it's blocked out, from its mask. */
async function paintFor(
  piece: string,
  draft: string | null | undefined,
): Promise<HTMLCanvasElement> {
  const picture = await loadImage(itemUrl(piece));
  const canvas = document.createElement("canvas");
  canvas.width = picture.naturalWidth;
  canvas.height = picture.naturalHeight;
  const url = draft === undefined ? maskUrl(piece) : draft;
  const context = canvas.getContext("2d");
  if (url && context) {
    const mask = await loadImage(url);
    context.fillStyle = paintColour;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "destination-out";
    context.drawImage(mask, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

/** A mask from the paint: white where it shows, clear where it's blocked out. */
function maskFrom(paint: HTMLCanvasElement): string | null {
  const context = paint.getContext("2d");
  const pixels = context?.getImageData(0, 0, paint.width, paint.height).data;
  if (!pixels?.some((value, i) => i % 4 === 3 && value > 0)) return null;
  const mask = document.createElement("canvas");
  mask.width = paint.width;
  mask.height = paint.height;
  const out = mask.getContext("2d");
  if (!out) return null;
  out.fillStyle = "#FFFFFF";
  out.fillRect(0, 0, mask.width, mask.height);
  out.globalCompositeOperation = "destination-out";
  out.drawImage(paint, 0, 0);
  return mask.toDataURL("image/png");
}

/** Paints over a piece to block parts of it out. */
function Eraser({
  piece,
  mask,
  at,
  brush,
  restoring,
  onStrokeStart,
  onChange,
}: {
  piece: string;
  /** The unsaved mask, null for none, undefined for the saved one. */
  mask: string | null | undefined;
  at: { x: number; y: number; width: number; height: number };
  brush: number;
  restoring: boolean;
  onStrokeStart(): void;
  onChange(mask: string | null): void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const paint = useRef<HTMLCanvasElement | null>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  // Read once: this mounts afresh whenever undo or reset changes the mask.
  const startingMask = useRef(mask);

  useEffect(() => {
    let stale = false;
    void paintFor(piece, startingMask.current).then((canvas) => {
      if (stale) return;
      paint.current = canvas;
      holder.current?.replaceChildren(canvas);
    });
    return () => {
      stale = true;
    };
  }, [piece]);

  const stroke = (e: React.PointerEvent) => {
    const canvas = paint.current;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!canvas) return;
    const toX = canvas.width / rect.width;
    const toY = canvas.height / rect.height;
    const point = {
      x: (e.clientX - rect.left) * toX,
      y: (e.clientY - rect.top) * toY,
    };
    const context = canvas.getContext("2d");
    if (!context) return;
    context.save();
    context.globalCompositeOperation = restoring
      ? "destination-out"
      : "source-over";
    context.strokeStyle = paintColour;
    context.lineCap = "round";
    context.lineWidth = (brush * toX * rect.width) / at.width;
    context.beginPath();
    const from = last.current ?? point;
    context.moveTo(from.x, from.y);
    context.lineTo(point.x + 0.01, point.y);
    context.stroke();
    context.restore();
    last.current = point;
  };

  return (
    <div
      className={styles.eraser}
      style={{ left: at.x, top: at.y, width: at.width, height: at.height }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = null;
        onStrokeStart();
        stroke(e);
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        if (e.buttons) stroke(e);
      }}
      onPointerLeave={() => setCursor(null)}
      onPointerUp={() => {
        last.current = null;
        if (paint.current) onChange(maskFrom(paint.current));
      }}
    >
      <div ref={holder} className={styles.paint} />
      {cursor && (
        <div
          className={styles.cursor}
          style={{
            left: cursor.x - brush / 2,
            top: cursor.y - brush / 2,
            width: brush,
            height: brush,
          }}
        />
      )}
    </div>
  );
}
