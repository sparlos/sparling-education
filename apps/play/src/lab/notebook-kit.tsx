// The rough notebook for the two notebook prototypes (notebook-cargo-line,
// notebook-fraction-hop). It stands in for the play shell: a left-hand column
// with the button, a sheet that slides out over the whole screen, and a card it
// shrinks to. Throwaway; see .scratch/notebook/spec.md.
import { palette } from "@repo/tokens";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** The two things a game tells the notebook. */
export interface Notebook {
  /**
   * A new id empties the page. The same id again only updates the picture.
   * Anything in the picture wrapped in `NotebookPiece` can be dragged onto the
   * page.
   */
  task(id: unknown, picture: ReactNode): void;
  /** The action is starting: closes the full notebook, but leaves the card. */
  close(): void;
}

interface Point {
  x: number;
  y: number;
}
type Stroke = Point[];
type Mode = "closed" | "open" | "card";
type Tool = "type" | "draw";

/** One square of typed working: a character, a small digit above it, a cross-out. */
interface Written {
  char?: string;
  small?: string;
  crossed?: boolean;
}
type Cells = Record<string, Written>;
interface Square {
  row: number;
  col: number;
}
/** The line under a sum: along the bottom of a row, across some columns. */
interface Rule {
  row: number;
  from: number;
  to: number;
}
const cellKey = (row: number, col: number) => `${row},${col}`;
const parseKey = (key: string) =>
  key.split(",").map(Number) as [number, number];

/** Something a game handed over, now on the page. Ink is drawn on top of it. */
interface Placed {
  key: number;
  x: number;
  y: number;
  w: number;
  h: number;
  node: ReactNode;
}

const square = 40;
const penWidth = 4;
const cardWidth = 266;
const cardHeight = 190;
const growColumn = 52;
const slideMs = 220;
/** A press that moves less than this is a tap, not a stroke. */
const tapSlop = 8;

const toolButton: CSSProperties = {
  minWidth: 48,
  minHeight: 48,
  padding: "0 12px",
  fontSize: 16,
  fontWeight: 700,
  borderRadius: 10,
  border: `2px solid ${palette.ink[4]}`,
  background: palette.sand[0],
  color: palette.ink[9],
  touchAction: "manipulation",
};

const BeginDrag = createContext<
  ((e: ReactPointerEvent, content: ReactNode, digits?: string) => void) | null
>(null);

/**
 * Makes part of a game's picture draggable onto the page. `digits` land as
 * ordinary typed squares, so they can be crossed out and fixed like any others.
 * `content` can be anything else: the notebook only moves it around. Outside
 * the notebook, this just shows its children.
 */
export function NotebookPiece({
  content,
  digits,
  children,
}: {
  content?: ReactNode;
  digits?: string;
  children: ReactNode;
}) {
  const begin = useContext(BeginDrag);
  if (!begin) return <>{children}</>;
  return (
    <div
      data-notebook-piece
      onPointerDown={(e) => begin(e, content, digits)}
      style={{ touchAction: "none", cursor: "grab", userSelect: "none" }}
    >
      {children}
    </div>
  );
}

/** A number with one character per square, so columns line up on the page. */
export function NumberPiece({ text }: { text: string }) {
  return (
    <div style={{ display: "flex" }}>
      {[...text.replace(/\s/g, "")].map((char, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed number's characters
          key={i}
          style={{
            width: square,
            height: square,
            lineHeight: `${square}px`,
            textAlign: "center",
            fontSize: 28,
            fontWeight: 700,
            color: palette.ink[9],
          }}
        >
          {char}
        </div>
      ))}
    </div>
  );
}

/** The typed working. Pointers go through it to the page. */
function WrittenSquares({ cells, rules }: { cells: Cells; rules: Rule[] }) {
  return (
    <>
      {Object.entries(cells).map(([key, cell]) => {
        const [row, col] = parseKey(key);
        return (
          <div
            key={key}
            data-notebook-square={key}
            style={{
              position: "absolute",
              left: col * square,
              top: row * square,
              width: square,
              height: square,
              lineHeight: `${square}px`,
              textAlign: "center",
              fontSize: 28,
              fontWeight: 700,
              color: palette.ink[9],
              pointerEvents: "none",
              userSelect: "none",
              backgroundImage: cell.crossed
                ? `linear-gradient(to top left, transparent 46%, ${palette.ember[6]} 46%, ${palette.ember[6]} 54%, transparent 54%)`
                : undefined,
            }}
          >
            {cell.char}
            {cell.small && (
              <span
                style={{
                  position: "absolute",
                  left: 1,
                  top: 1,
                  lineHeight: 1,
                  fontSize: 16,
                  color: palette.sky[9],
                }}
              >
                {cell.small}
              </span>
            )}
          </div>
        );
      })}
      {rules.map((r) => (
        <div
          key={r.row}
          data-notebook-rule
          style={{
            position: "absolute",
            left: r.from * square,
            top: (r.row + 1) * square - 2,
            width: (r.to - r.from + 1) * square,
            height: 4,
            background: palette.ink[9],
            pointerEvents: "none",
          }}
        />
      ))}
    </>
  );
}

function PlacedPieces({ placed }: { placed: Placed[] }) {
  return placed.map((p) => (
    <div
      key={p.key}
      data-notebook-placed
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: p.w,
        height: p.h,
        background: palette.sky[0],
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {p.node}
    </div>
  ));
}

function inkStyle(ctx: CanvasRenderingContext2D, width: number) {
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = palette.ink[9];
}

function line(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[]) {
  for (const stroke of strokes) {
    const first = stroke[0];
    if (!first) continue;
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    // A lone tap still leaves a dot: round caps need a line to draw.
    if (stroke.length === 1) ctx.lineTo(first.x, first.y);
    for (const point of stroke.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }
}

const snap = (value: number, max: number) =>
  Math.max(0, Math.min(Math.round(value / square) * square, max));

const pieceAt = (placed: Placed[], at: Point) =>
  [...placed]
    .reverse()
    .find(
      (p) =>
        at.x >= p.x && at.x <= p.x + p.w && at.y >= p.y && at.y <= p.y + p.h,
    );

/**
 * The page: pieces, with a canvas over them, so ink can cross out a digit. The
 * canvas takes every press. Drawing never re-renders React.
 *
 * A stroke that starts on a piece is ink, so a student can write on it. Tapping
 * a piece selects it: then it can be dragged, or removed with its ✕.
 */
function Page({
  strokes,
  page,
  placed,
  onPlaced,
  wrapper,
  tool,
  at,
  onAt,
  cells,
  rules,
}: {
  strokes: Stroke[];
  page: number;
  placed: Placed[];
  onPlaced(update: (placed: Placed[]) => Placed[]): void;
  wrapper: RefObject<HTMLDivElement | null>;
  tool: Tool;
  at: Square;
  onAt(at: Square): void;
  cells: Cells;
  rules: Rule[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const drawing = useRef<{
    id: number;
    stroke: Stroke;
    left: number;
    top: number;
    start: Point;
    far: number;
  } | null>(null);
  const moving = useRef<{
    id: number;
    key: number;
    dx: number;
    dy: number;
    left: number;
    top: number;
  } | null>(null);

  const repaint = useCallback(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, el.width, el.height);
    inkStyle(ctx, penWidth);
    paint(ctx, strokes);
  }, [strokes]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      el.width = Math.round(el.clientWidth * dpr);
      el.height = Math.round(el.clientHeight * dpr);
      repaint();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [repaint]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: page is what changes when the strokes empty
  useEffect(() => {
    drawing.current = null;
    moving.current = null;
    setSelected(null);
    repaint();
  }, [page, repaint]);

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    // One pen at a time, so a resting palm or second finger doesn't draw.
    if (drawing.current || moving.current || e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Read once per press, to keep layout out of the move handler.
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const hit = pieceAt(placed, point);
    if (hit && hit.key === selected) {
      moving.current = {
        id: e.pointerId,
        key: hit.key,
        dx: point.x - hit.x,
        dy: point.y - hit.y,
        left: rect.left,
        top: rect.top,
      };
      return;
    }

    if (tool === "type") {
      // A tap picks a piece if there's one, otherwise the square to type in.
      setSelected(hit ? hit.key : null);
      if (!hit)
        onAt({
          row: Math.floor(point.y / square),
          col: Math.floor(point.x / square),
        });
      return;
    }

    setSelected(null);
    const stroke = [point];
    strokes.push(stroke);
    drawing.current = {
      id: e.pointerId,
      stroke,
      left: rect.left,
      top: rect.top,
      start: point,
      far: 0,
    };
    const ctx = e.currentTarget.getContext("2d");
    if (ctx) line(ctx, point, point);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const shift = moving.current;
    if (shift?.id === e.pointerId) {
      const x = e.clientX - shift.left - shift.dx;
      const y = e.clientY - shift.top - shift.dy;
      onPlaced((all) =>
        all.map((p) => (p.key === shift.key ? { ...p, x, y } : p)),
      );
      return;
    }
    const now = drawing.current;
    if (!now || now.id !== e.pointerId) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const events = coalesced.length > 0 ? coalesced : [e.nativeEvent];
    for (const event of events) {
      const point = { x: event.clientX - now.left, y: event.clientY - now.top };
      const last = now.stroke[now.stroke.length - 1];
      if (last) line(ctx, last, point);
      now.stroke.push(point);
      now.far = Math.max(
        now.far,
        Math.hypot(point.x - now.start.x, point.y - now.start.y),
      );
    }
  };

  const finish = (e: ReactPointerEvent<HTMLCanvasElement>, tapped: boolean) => {
    const el = e.currentTarget;
    if (moving.current?.id === e.pointerId) {
      const { key } = moving.current;
      moving.current = null;
      onPlaced((all) =>
        all.map((p) =>
          p.key === key
            ? {
                ...p,
                x: snap(p.x, el.clientWidth - p.w),
                y: snap(p.y, el.clientHeight - p.h),
              }
            : p,
        ),
      );
      return;
    }
    const now = drawing.current;
    if (now?.id !== e.pointerId) return;
    drawing.current = null;
    if (!tapped || now.far >= tapSlop) return;
    const hit = pieceAt(placed, now.start);
    if (!hit) return;
    // A tap on a piece selects it, and leaves no dot behind.
    strokes.pop();
    repaint();
    setSelected(hit.key);
  };

  const chosen = placed.find((p) => p.key === selected);

  return (
    <div
      ref={wrapper}
      style={{
        flex: 1,
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "white",
        backgroundImage: `linear-gradient(to right, ${palette.sky[1]} 1px, transparent 1px), linear-gradient(to bottom, ${palette.sky[1]} 1px, transparent 1px)`,
        backgroundSize: `${square}px ${square}px`,
      }}
    >
      <PlacedPieces placed={placed} />
      <WrittenSquares cells={cells} rules={rules} />
      {tool === "type" && (
        <div
          data-notebook-highlight
          style={{
            position: "absolute",
            left: at.col * square,
            top: at.row * square,
            width: square,
            height: square,
            boxSizing: "border-box",
            border: `3px solid ${palette.sky[6]}`,
            borderRadius: 4,
            pointerEvents: "none",
          }}
        />
      )}
      <canvas
        ref={canvas}
        data-notebook-page
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => finish(e, true)}
        onPointerCancel={(e) => finish(e, false)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          touchAction: "none",
          cursor: tool === "draw" ? "crosshair" : "pointer",
        }}
      />
      {chosen && (
        <>
          <div
            style={{
              position: "absolute",
              left: chosen.x,
              top: chosen.y,
              width: chosen.w,
              height: chosen.h,
              outline: `3px solid ${palette.sky[6]}`,
              pointerEvents: "none",
            }}
          />
          <button
            type="button"
            aria-label="Remove this from the page"
            onClick={() => {
              onPlaced((all) => all.filter((p) => p.key !== chosen.key));
              setSelected(null);
            }}
            style={{
              ...toolButton,
              position: "absolute",
              left: `min(${chosen.x + chosen.w - 24}px, calc(100% - 48px))`,
              top: Math.max(0, chosen.y - 24),
              padding: 0,
              fontSize: 20,
            }}
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}

/** The card's contents: only the writing and pieces, zoomed to fill it. */
function CardInk({
  strokes,
  placed,
  page,
  cells,
  rules,
}: {
  strokes: Stroke[];
  placed: Placed[];
  page: number;
  cells: Cells;
  rules: Rule[];
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const width = cardWidth - growColumn;
  const height = cardHeight;

  const points = [
    ...strokes.flat(),
    ...placed.flatMap((p) => [
      { x: p.x, y: p.y },
      { x: p.x + p.w, y: p.y + p.h },
    ]),
    ...Object.keys(cells).flatMap((key) => {
      const [row, col] = parseKey(key);
      return [
        { x: col * square, y: row * square },
        { x: (col + 1) * square, y: (row + 1) * square },
      ];
    }),
    ...rules.flatMap((r) => [
      { x: r.from * square, y: (r.row + 1) * square },
      { x: (r.to + 1) * square, y: (r.row + 1) * square },
    ]),
  ];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  // At least one square's worth, so a single mark doesn't fill the card.
  const contentWidth = Math.max(Math.max(...xs) - left, square);
  const contentHeight = Math.max(Math.max(...ys) - top, square);
  const pad = 12;
  const scale = Math.min(
    (width - pad * 2) / contentWidth,
    (height - pad * 2) / contentHeight,
  );
  const dx = (width - contentWidth * scale) / 2 - left * scale;
  const dy = (height - contentHeight * scale) / 2 - top * scale;
  const hasContent = points.length > 0;

  // biome-ignore lint/correctness/useExhaustiveDependencies: page is what changes when the strokes empty
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(width * dpr);
    el.height = Math.round(height * dpr);
    if (!hasContent) return;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * dx, dpr * dy);
    // Scaled with the writing, but never thinner than 1.5 px on the card.
    inkStyle(ctx, Math.max(penWidth, 1.5 / scale));
    paint(ctx, strokes);
  }, [strokes, page, width, height, hasContent, scale, dx, dy]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        overflow: "hidden",
      }}
    >
      {hasContent && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transformOrigin: "0 0",
            transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
          }}
        >
          <PlacedPieces placed={placed} />
          <WrittenSquares cells={cells} rules={rules} />
        </div>
      )}
      <canvas
        ref={canvas}
        data-notebook-card-ink
        style={{ position: "absolute", left: 0, top: 0, width, height }}
      />
    </div>
  );
}

/**
 * The card: dragged from anywhere on it, and it can't leave the screen. It
 * stays where it's put until the play ends.
 */
function Card({
  at,
  onMove,
  onGrow,
  children,
}: {
  at: Point;
  onMove(at: Point): void;
  onGrow(): void;
  children: ReactNode;
}) {
  const grab = useRef<{ id: number; x: number; y: number } | null>(null);
  const clamp = useCallback(
    (p: Point): Point => ({
      x: Math.max(0, Math.min(window.innerWidth - cardWidth, p.x)),
      y: Math.max(0, Math.min(window.innerHeight - cardHeight, p.y)),
    }),
    [],
  );

  useEffect(() => {
    const refit = () => onMove(clamp(at));
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [at, clamp, onMove]);

  return (
    <div
      data-notebook-card
      onPointerDown={(e) => {
        if (grab.current) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        grab.current = {
          id: e.pointerId,
          x: e.clientX - at.x,
          y: e.clientY - at.y,
        };
      }}
      onPointerMove={(e) => {
        const g = grab.current;
        if (g?.id === e.pointerId)
          onMove(clamp({ x: e.clientX - g.x, y: e.clientY - g.y }));
      }}
      onPointerUp={() => {
        grab.current = null;
      }}
      onPointerCancel={() => {
        grab.current = null;
      }}
      style={{
        position: "fixed",
        left: at.x,
        top: at.y,
        width: cardWidth,
        height: cardHeight,
        zIndex: 20,
        background: "white",
        borderRadius: 12,
        border: `2px solid ${palette.ink[5]}`,
        boxSizing: "border-box",
        boxShadow: "0 6px 20px rgb(0 0 0 / 25%)",
        overflow: "hidden",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {children}
      <button
        type="button"
        aria-label="Make the notebook bigger"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onGrow}
        style={{
          ...toolButton,
          position: "absolute",
          right: 2,
          top: 2,
          padding: 0,
          fontSize: 22,
        }}
      >
        ⤢
      </button>
    </div>
  );
}

/** The keys: the same layout as a game's number pad, but they fill a square. */
function Pad({
  tool,
  onTool,
  onKey,
}: {
  tool: Tool;
  onTool(tool: Tool): void;
  onKey(key: string): void;
}) {
  const key = (k: string, label: string) => (
    <button
      key={k}
      type="button"
      aria-label={label}
      disabled={tool === "draw"}
      onClick={() => onKey(k)}
      style={{
        ...toolButton,
        padding: 0,
        minHeight: 52,
        fontSize: k.length > 1 && k !== "del" ? 15 : 24,
        background: palette.sand[0],
        opacity: tool === "draw" ? 0.4 : 1,
      }}
    >
      {k === "del" ? "⌫" : k.length > 1 ? label : k}
    </button>
  );
  const toolKey = (t: Tool, label: string) => (
    <button
      type="button"
      aria-pressed={tool === t}
      onClick={() => onTool(t)}
      style={{
        ...toolButton,
        flex: 1,
        background: tool === t ? palette.sky[1] : "white",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      data-notebook-pad
      style={{
        width: 240,
        flexShrink: 0,
        padding: 8,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        {toolKey("type", "Type")}
        {toolKey("draw", "Draw")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
        }}
      >
        {["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0"].map((k) =>
          key(k, k),
        )}
        {key("del", "Delete")}
        {key("+", "Plus")}
        {key("−", "Minus")}
        {key("line", "Line")}
      </div>
      <div style={{ display: "grid" }}>{key("borrow", "Borrow")}</div>
    </div>
  );
}

/**
 * Stands in for the shell. The game goes in `children`, and gets the notebook.
 * What's on the page and where the card is last as long as this does: one play.
 */
export function NotebookScreen({
  children,
}: {
  children(notebook: Notebook): ReactNode;
}) {
  const [mode, setMode] = useState<Mode>("closed");
  const [picture, setPicture] = useState<ReactNode>(null);
  const [page, setPage] = useState(0);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [cardAt, setCardAt] = useState<Point | null>(null);
  const [drag, setDrag] = useState<Point | null>(null);
  const [tool, setTool] = useState<Tool>("type");
  const [cells, setCells] = useState<Cells>({});
  const [rules, setRules] = useState<Rule[]>([]);
  const [at, setAtState] = useState<Square>({ row: 2, col: 12 });
  const strokes = useRef<Stroke[]>([]);
  const taskId = useRef<unknown>(undefined);
  const nextKey = useRef(0);
  const gameArea = useRef<HTMLDivElement>(null);
  const pageArea = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const dragNode = useRef<ReactNode>(null);
  const dragDigits = useRef<string | undefined>(undefined);

  // What the next digit does on this visit to the square. Arriving resets it.
  const typing = useRef<"fresh" | "replacing" | "small">("fresh");
  const setAt = useCallback((next: Square) => {
    setAtState(next);
    typing.current = "fresh";
  }, []);

  const emptyPage = useCallback(() => {
    strokes.current.length = 0;
    setPlaced([]);
    setCells({});
    setRules([]);
    typing.current = "fresh";
    setPage((p) => p + 1);
  }, []);

  const notebook = useMemo<Notebook>(
    () => ({
      task(id, next) {
        setPicture(next);
        if (id !== taskId.current) {
          taskId.current = id;
          emptyPage();
        }
      },
      close() {
        setMode((m) => (m === "open" ? "closed" : m));
      },
    }),
    [emptyPage],
  );

  const beginDrag = useCallback(
    (e: ReactPointerEvent, content: ReactNode, digits?: string) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragDigits.current = digits?.replace(/\s/g, "");
      dragNode.current = digits ? <NumberPiece text={digits} /> : content;
      setDrag({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      setDrag({ x: e.clientX, y: e.clientY });
    };
    const up = () => {
      const from = ghost.current?.getBoundingClientRect();
      const to = pageArea.current?.getBoundingClientRect();
      const node = dragNode.current;
      setDrag(null);
      if (!from || !to) return;
      const centreX = from.left + from.width / 2;
      const centreY = from.top + from.height / 2;
      if (
        centreX < to.left ||
        centreX > to.right ||
        centreY < to.top ||
        centreY > to.bottom
      )
        return;
      const x = snap(from.left - to.left, to.width - from.width);
      const y = snap(from.top - to.top, to.height - from.height);
      const digits = dragDigits.current;
      if (digits) {
        // A number becomes ordinary squares, written over what's there.
        const row = Math.round(y / square);
        const col = Math.round(x / square);
        setCells((all) => {
          const next = { ...all };
          [...digits].forEach((char, i) => {
            next[cellKey(row, col + i)] = { char };
          });
          return next;
        });
        return;
      }
      const piece: Placed = {
        key: nextKey.current++,
        node,
        w: from.width,
        h: from.height,
        x,
        y,
      };
      setPlaced((all) => [...all, piece]);
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging]);

  const press = (k: string) => {
    const here = cellKey(at.row, at.col);
    if (k === "line") {
      const filled = (row: number) =>
        Object.keys(cells)
          .map(parseKey)
          .filter(([r]) => r === row)
          .map(([, c]) => c);
      // On an empty row, the line goes under the row above: the sum's last number.
      const row =
        filled(at.row).length > 0 || filled(at.row - 1).length === 0
          ? at.row
          : at.row - 1;
      // The line spans the whole sum: this row and the rows stacked above it.
      const cols = filled(row);
      for (let r = row - 1; filled(r).length > 0; r--) cols.push(...filled(r));
      const rule = {
        row,
        from: cols.length ? Math.min(...cols) : at.col,
        to: cols.length ? Math.max(...cols) : at.col,
      };
      return setRules((all) =>
        all.some((r) => r.row === row)
          ? all.filter((r) => r.row !== row)
          : [...all, rule],
      );
    }
    const cell = cells[here] ?? {};
    const next = { ...cells };
    if (k === "borrow") {
      // This digit takes a ten from the digit on its left, past a decimal point.
      const beside = cellKey(at.row, at.col - 1);
      const leftKey =
        cells[beside]?.char === "." ? cellKey(at.row, at.col - 2) : beside;
      const left = cells[leftKey];
      const worth = (c?: Written) => Number(c?.small ?? c?.char);
      const mine = worth(cell);
      const theirs = worth(left);
      // A 0 on the left has nothing to give yet, the same rule as on paper.
      if (!/^\d/.test(cell.char ?? "") || !/^\d/.test(left?.char ?? "")) return;
      if (mine >= 10 || theirs < 1) return;
      next[leftKey] = {
        char: left?.char,
        crossed: true,
        small: String(theirs - 1),
      };
      next[here] = {
        char: cell.char,
        crossed: true,
        small: String(mine + 10),
      };
      typing.current = "fresh";
      setCells(next);
      return;
    }
    if (k === "del") {
      // Undoes a regroup first, bringing the old digit back.
      if (cell.small) next[here] = { char: cell.char };
      else delete next[here];
      typing.current = "fresh";
    } else if (!/[0-9]/.test(k)) {
      next[here] = { char: k };
      typing.current = "replacing";
    } else if (typing.current === "small") {
      next[here] = { ...cell, small: `${cell.small ?? ""}${k}`.slice(-2) };
    } else if (typing.current === "fresh" && cell.char) {
      // Typing on a digit that was already here is like writing over it on
      // paper: the old one is crossed out, and the new one goes small above it.
      next[here] = { char: cell.char, crossed: true, small: k };
      typing.current = "small";
    } else {
      // A digit just typed in this square is a slip: it's simply replaced.
      next[here] = { char: k };
      typing.current = "replacing";
    }
    setCells(next);
  };

  const open = mode === "open";

  // A real keyboard works too: keys type, and the arrows move the square.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (!open || tool !== "type") return;
    const area = pageArea.current?.getBoundingClientRect();
    const rows = Math.floor((area?.height ?? 0) / square);
    const cols = Math.floor((area?.width ?? 0) / square);
    const arrows: Record<string, Square> = {
      ArrowLeft: { row: at.row, col: Math.max(0, at.col - 1) },
      ArrowRight: { row: at.row, col: Math.min(cols - 1, at.col + 1) },
      ArrowUp: { row: Math.max(0, at.row - 1), col: at.col },
      ArrowDown: { row: Math.min(rows - 1, at.row + 1), col: at.col },
    };
    const arrow = arrows[e.key];
    if (arrow) {
      e.preventDefault();
      setAt(arrow);
    } else if (/^[0-9.+]$/.test(e.key)) {
      press(e.key);
    } else if (e.key === "-") {
      press("−");
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      press("del");
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const shrink = () => {
    if (!cardAt) {
      const area = gameArea.current?.getBoundingClientRect();
      setCardAt({ x: (area?.left ?? 0) + 16, y: (area?.top ?? 0) + 16 });
    }
    setMode("card");
  };

  // The game only re-renders on its own state, not on every notebook change.
  const game = useMemo(() => children(notebook), [children, notebook]);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div style={{ height: "100%", display: "flex" }}>
      <div
        style={{
          width: 88,
          flexShrink: 0,
          padding: 8,
          boxSizing: "border-box",
          borderRight: `1px solid ${palette.ink[2]}`,
        }}
      >
        <button
          type="button"
          aria-pressed={open}
          onClick={() => setMode(open ? "closed" : "open")}
          style={{
            ...toolButton,
            width: "100%",
            minHeight: 64,
            padding: 0,
            fontSize: 13,
            background: open ? palette.sky[1] : palette.sand[0],
          }}
        >
          Notebook
        </button>
      </div>
      <div
        ref={gameArea}
        style={{
          flex: 1,
          minWidth: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {game}
        <section
          aria-label="Notebook"
          aria-hidden={!open}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            background: palette.sand[0],
            borderRight: `2px solid ${palette.ink[4]}`,
            boxShadow: open ? "6px 0 20px rgb(0 0 0 / 20%)" : "none",
            transform: open ? "none" : "translateX(-102%)",
            visibility: open ? "visible" : "hidden",
            transition: reduced
              ? "none"
              : `transform ${slideMs}ms ease-out, visibility 0ms linear ${open ? 0 : slideMs}ms`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: 8,
              minHeight: 72,
              boxSizing: "border-box",
            }}
          >
            <div data-notebook-picture style={{ flex: 1, minWidth: 0 }}>
              <BeginDrag.Provider value={beginDrag}>
                {picture}
              </BeginDrag.Provider>
            </div>
            <button type="button" onClick={emptyPage} style={toolButton}>
              Clear
            </button>
            <button type="button" onClick={shrink} style={toolButton}>
              Shrink
            </button>
            <button
              type="button"
              onClick={() => setMode("closed")}
              style={toolButton}
            >
              Close
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
            <Page
              strokes={strokes.current}
              page={page}
              placed={placed}
              onPlaced={setPlaced}
              wrapper={pageArea}
              tool={tool}
              at={at}
              onAt={setAt}
              cells={cells}
              rules={rules}
            />
            <Pad tool={tool} onTool={setTool} onKey={press} />
          </div>
        </section>
      </div>
      {mode === "card" && cardAt && (
        <Card at={cardAt} onMove={setCardAt} onGrow={() => setMode("open")}>
          <CardInk
            strokes={strokes.current}
            placed={placed}
            page={page}
            cells={cells}
            rules={rules}
          />
        </Card>
      )}
      {drag && (
        <div
          ref={ghost}
          data-notebook-ghost
          style={{
            position: "fixed",
            left: drag.x,
            top: drag.y,
            width: "max-content",
            // Above the finger, so the student can see what they're placing.
            transform: "translate(-50%, calc(-50% - 28px))",
            zIndex: 30,
            pointerEvents: "none",
            background: palette.sky[0],
            boxShadow: "0 4px 12px rgb(0 0 0 / 25%)",
          }}
        >
          {dragNode.current}
        </div>
      )}
    </div>
  );
}
