// Points at whatever `data-hand` names, for the tutorial and the help
// nudge ("center" is the middle of the board). On the lower half of the
// screen it points down from above, so it never runs off the bottom.
// `tapping` presses it in. From Crystal Machine.
import { useLayoutEffect, useRef, useState } from "react";
import { art, ScreenArt } from "./art.tsx";
import styles from "./game.module.css";

export function GhostHand({
  target,
  tapping,
}: {
  target: string | null;
  tapping: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState<{
    x: number;
    y: number;
    flipped: boolean;
  } | null>(null);
  const [shown, setShown] = useState(false);
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
  const { anchor } = art["ghost-hand"];
  return (
    <div
      ref={ref}
      className={`${styles.hand} ${appearing ? styles.appearing : ""}`}
      data-testid="ghost-hand"
      data-target={shown && at ? target : undefined}
      style={{
        transform: at
          ? `translate(${at.x - anchor.x}px, ${at.y - anchor.y}px)`
          : undefined,
        opacity: shown && at ? 1 : 0,
      }}
      aria-hidden="true"
    >
      <div
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
